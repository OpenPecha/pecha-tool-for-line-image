"use server";

import { formatTime } from "@/lib/formatTime";
import prisma from "@/service/db";
import { $Enums } from "@prisma/client";
import { revalidatePath } from "next/cache";

const ASSIGN_TASKS = 5;
const MAX_HISTORY = 20; // Define as a constant

/**
 * Retrieves user details by email from the database.
 *
 * @param {string} email - The email of the user to be fetched.
 * @returns {Object|null} The user data object if found, otherwise null.
 * @throws {Error} Throws an error if the database query fails.
 */
export const getUserDetails = async (email) => {
  try {
    const userData = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        group: true,
      },
    });
    console.log("userData", userData);
    // Return early if no user data is found
    if (!userData) {
      return null;
    }

    // Return the user data
    return userData;
  } catch (error) {
    // console.error("Failed to retrieve user details:", error);
    throw new Error("Error fetching user details.");
  }
};

// get task based on username
export const getUserTask = async (email) => {
  let userTasks;
  const userData = await getUserDetails(email);
  if (userData === null) {
    return {
      error:
        "No user found. Please try again with the correct username or email.",
    };
  }
  // if user is found, get the task based on user role
  const { id: userId, group_id: groupId, role } = userData;
  userTasks = await getTasksOrAssignMore(groupId, userId, role);
  const userHistory = await getUserHistory(userId);

  return { userTasks, userData, userHistory };
};

/**
 * Retrieves assigned tasks for a user based on their role or assigns more tasks if none are assigned.
 *
 * @param {number} groupId - The group ID to filter the tasks.
 * @param {number} userId - The user ID to assign tasks to.
 * @param {"TRANSCRIBER" | "REVIEWER" | "FINAL_REVIEWER"} role - The role of the user.
 * @returns {Promise<Array>} An array of tasks.
 * @throws {Error} Throws an error if unable to retrieve or assign tasks.
 */
export const getTasksOrAssignMore = async (groupId, userId, role) => {
  // Define role-specific parameters
  const roleParams = {
    TRANSCRIBER: { state: "transcribing", taskField: "transcriber_id" },
    REVIEWER: {
      state: "submitted",
      taskField: "reviewer_id",
      include: { transcriber: true },
    },
    FINAL_REVIEWER: {
      state: "accepted",
      taskField: "final_reviewer_id",
      include: { transcriber: true, reviewer: true },
    },
  };

  const { state, taskField, include } = roleParams[role] || {};

  if (!state || !taskField) {
    throw new Error(`Invalid role: ${role}`);
  }

  try {
    const assignedTasks = await prisma.task.findMany({
      where: {
        group_id: groupId,
        state,
        [taskField]: userId,
      },
      include,
      orderBy: { id: "asc" },
    });

    if (assignedTasks && assignedTasks.length > 0) return assignedTasks;

    // Assign tasks if no tasks are currently assigned
    const unassignedTasks = await prisma.task.findMany({
      where: {
        group_id: groupId,
        state,
        [taskField]: null,
      },
      orderBy: { id: "asc" },
      take: ASSIGN_TASKS,
    });

    if (unassignedTasks && unassignedTasks.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: unassignedTasks.map((task) => task.id) } },
        data: { [taskField]: userId },
      });
      return unassignedTasks;
    }

    return [];
  } catch (error) {
    console.error(`Error while handling tasks for ${role}:`, error);
    throw new Error(
      `Error while getting or assigning tasks for ${role}. Please try another.`
    );
  }
};

// get all the history of a user based on userId
export const getUserHistory = async (userId) => {
  try {
    const userHistory = await prisma.task.findMany({
      where: {
        OR: [
          {
            transcriber_id: userId,
            state: { in: ["submitted", "trashed"] },
          },
          {
            reviewer_id: userId,
            state: { in: ["accepted", "trashed"] },
          },
          {
            final_reviewer_id: userId,
            state: { in: ["finalised", "trashed"] },
          },
        ],
      },
      orderBy: {
        id: "desc",
      },
      take: MAX_HISTORY,
    });
    revalidatePath("/");
    return userHistory;
  } catch (error) {
    // console.error("Error getting user history:", error);
    throw new Error("An error occurred while fetching the user history.");
  }
};

// to change the state of task based on user action (state machine)
export const changeTaskState = (task, role, action) => {
  switch (role) {
    case "TRANSCRIBER":
      return action === "submit"
        ? { ...task, state: "submitted" }
        : action === "trash"
        ? { ...task, state: "trashed" }
        : { ...task, state: "transcribing" };
      break;
    case "REVIEWER":
      return action === "submit"
        ? { ...task, state: "accepted" }
        : action === "reject"
        ? { ...task, state: "transcribing" }
        : { ...task, state: "submitted" };
      break;
    case "FINAL_REVIEWER":
      return action === "submit"
        ? { ...task, state: "finalised" }
        : action === "reject"
        ? { ...task, state: "submitted" }
        : { ...task, state: "accepted" };
      break;
    default:
      break;
  }
};

// update the takes based on user action
export const updateTask = async (
  action,
  id,
  transcript,
  task,
  role,
  currentTime
) => {
  //console.log("update task", action, id, transcript, task, role, currentTime);
  const changeState = await changeTaskState(task, role, action);
  let duration = null;
  if (changeState.state === "submitted" || changeState.state === "accepted") {
    // convert iso date to timestamp
    let startTime = Date.parse(currentTime);
    let endTime = Date.now();
    let timeDiff = endTime - startTime;
    duration = formatTime(timeDiff);
    //console.log("duration", duration);
  }
  switch (role) {
    case "TRANSCRIBER":
      try {
        const updatedTask = await prisma.task.update({
          where: {
            id,
          },
          data: {
            state: changeState.state,
            transcript: changeState.state === "trashed" ? null : transcript,
            reviewed_transcript: null,
            submitted_at: new Date().toISOString(),
            duration: duration,
          },
        });
        if (updatedTask) {
          const msg = await taskToastMsg(action);
          revalidatePath("/");
          return { msg, updatedTask };
        } else {
          return {
            error: "Error updating task",
          };
        }
      } catch (error) {
        //console.log("Error updating TRANSCRIBER task", error);
      }
      break;
    case "REVIEWER":
      try {
        const updatedTask = await prisma.task.update({
          where: {
            id,
          },
          data: {
            state: changeState.state,
            // when reviewer reject the task, set transcript as incoming transcript and other action keep it same

            reviewed_transcript:
              changeState.state === "trashed" ||
              changeState.state === "transcribing"
                ? null
                : transcript,
            reviewed_at: new Date().toISOString(),
          },
        });
        if (updatedTask) {
          const msg = await taskToastMsg(action);
          revalidatePath("/");
          return { msg, updatedTask };
        } else {
          return {
            error: "Error updating task",
          };
        }
      } catch (error) {
        //console.log("Error updating REVIEWER task", error);
      }
      break;
    case "FINAL_REVIEWER":
      try {
        const updatedTask = await prisma.task.update({
          where: {
            id,
          },
          data: {
            state: changeState.state,
            final_reviewed_transcript:
              changeState.state === "trashed" ||
              changeState.state === "submitted"
                ? null
                : transcript,
          },
        });
        if (updatedTask) {
          const msg = await taskToastMsg(action);
          revalidatePath("/");
          return { msg, updatedTask };
        } else {
          return {
            error: "Error updating task",
          };
        }
      } catch (error) {
        //console.log("Error updating FINAL REVIEWER task", error);
      }
    default:
      break;
  }
};

export const taskToastMsg = async (action) => {
  switch (action) {
    case "submit":
      return {
        success: "Task is submitted successfully",
      };
      break;
    case "trash":
      return {
        success: "Task is trashed successfully",
      };
      break;
    case "reject":
      return {
        success: "Task is rejected successfully",
      };
      break;
    default:
      break;
  }
};
