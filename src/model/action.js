"use server";

import { formatTime } from "@/lib/formatTime";
import prisma from "@/service/db";
import { $Enums } from "@prisma/client";
import { revalidatePath } from "next/cache";

const ASSIGN_TASKS = 5;
const MAX_HISTORY = 20;
/**
 * Retrieves user details by email from the database
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
    // Return early if no user data is found
    if (!userData) {
      return null;
    }
    // Return the user data
    return userData;
  } catch (error) {
    console.error("Failed to retrieve user details:", error);
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
  const userHistory = await getUserHistory(userId, groupId, role);
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
      batchAssign: [
        "batch19",
        "batch20",
        "batch21",
        "batch22",
        "batch23",
        "batch24",
        "batch25",
        "batch26",
        "batch27",
        "batch28",
        "batch29",
        "batch30",
      ],
    },
    FINAL_REVIEWER: {
      state: "accepted",
      taskField: "final_reviewer_id",
      include: { transcriber: true, reviewer: true },
    },
  };

  const { state, taskField, include, batchAssign } = roleParams[role];

  if (!state || !taskField) {
    throw new Error(`Invalid role provided: ${role}`);
  }

  try {
    let tasks = await prisma.task.findMany({
      where: {
        group_id: groupId,
        state,
        [taskField]: userId,
        ...(batchAssign && { batch_id: { in: batchAssign } }),
      },
      include,
      orderBy: { id: "asc" },
    });

    if (tasks.length === 0) {
      tasks = await assignUnassignedTasks(
        groupId,
        state,
        taskField,
        userId,
        batchAssign
      );
    }

    return tasks;
  } catch (error) {
    console.error(
      `Failed to retrieve or assign tasks for role ${role}: ${error.message}`
    );
    throw new Error(
      `Failed to retrieve or assign tasks for role ${role}: ${error.message}`
    );
  }
};

export const assignUnassignedTasks = async (
  groupId,
  state,
  taskField,
  userId,
  batchAssign
) => {
  try {
    const unassignedTasks = await prisma.task.findMany({
      where: {
        group_id: groupId,
        state,
        [taskField]: null,
        ...(batchAssign && { batch_id: { in: batchAssign } }),
      },
      orderBy: { id: "asc" },
      take: ASSIGN_TASKS,
    });

    if (unassignedTasks.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: unassignedTasks.map((task) => task.id) } },
        data: { [taskField]: userId },
      });
    }

    return unassignedTasks;
  } catch (error) {
    console.error(`Failed to retrieve or assign tasks : ${error.message}`);
    throw new Error(`Failed to retrieve or assign tasks : ${error.message}`);
  }
};

// get all the history of a user based on userId
export const getUserHistory = async (userId, groupId, role) => {
  try {
    let whereCondition = {
      [`${role.toLowerCase()}_id`]: parseInt(userId),
      state:
        role === "TRANSCRIBER"
          ? { in: ["submitted", "trashed"] }
          : role === "REVIEWER"
          ? { in: ["accepted", "trashed"] }
          : "finalised",
      group_id: parseInt(groupId),
    };

    const userHistory = await prisma.task.findMany({
      where: whereCondition,
      orderBy: [
        {
          final_reviewed_at: "desc",
        },
        {
          reviewed_at: "desc",
        },
        {
          submitted_at: "desc",
        },
      ],
      take: MAX_HISTORY,
    });
    return userHistory;
  } catch (error) {
    console.error("Failed to retrieve user history:", error);
    throw new Error("Failed fetching user history.");
  }
};

// Task state transitions based on roles and actions
const taskStateTransitions = {
  TRANSCRIBER: {
    submit: "submitted",
    trash: "trashed",
    default: "transcribing",
  },
  REVIEWER: {
    submit: "accepted",
    reject: "transcribing",
    default: "submitted",
  },
  FINAL_REVIEWER: {
    submit: "finalised",
    reject: "submitted",
    default: "accepted",
  },
};

// Function to change the state of a task based on user action
export const changeTaskState = (task, role, action) => {
  const newState =
    taskStateTransitions[role]?.[action] || taskStateTransitions[role]?.default;
  return { ...task, state: newState };
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
  const changedTask = changeTaskState(task, role, action);
  let duration = null;

  if (["submitted", "accepted"].includes(changedTask.state)) {
    const startTime = Date.parse(currentTime);
    const endTime = Date.now();
    const timeDiff = endTime - startTime;
    duration = formatTime(timeDiff);
  }

  // Initialize data to update with common fields
  const dataToUpdate = {
    state: changedTask.state,
  };

  // Add role-specific fields
  switch (role) {
    case "TRANSCRIBER":
      dataToUpdate.transcript =
        changedTask.state === "trashed" ? null : transcript;
      dataToUpdate.submitted_at = new Date().toISOString();
      dataToUpdate.duration = duration;
      break;
    case "REVIEWER":
      dataToUpdate.reviewed_transcript =
        changedTask.state === "accepted" ? transcript : null;
      dataToUpdate.reviewed_at = new Date().toISOString();
      break;
    case "FINAL_REVIEWER":
      dataToUpdate.final_reviewed_transcript =
        changedTask.state === "finalised" ? transcript : null;
      dataToUpdate.final_reviewed_at = new Date().toISOString();
      break;
    default:
      // Optionally handle invalid roles or do nothing
      console.error(`Invalid role: ${role}`);
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
    });

    const msg = await taskToastMsg(action);

    // Assuming revalidatePath is a function to refresh or redirect the page
    revalidatePath("/");
    return { msg, updatedTask };
  } catch (error) {
    console.error(`Error updating ${role} task:`, error);
    return { error: "Error updating task" };
  }
};

// Function to generate toast messages based on action
export const taskToastMsg = async (action) => {
  const actionSuccessMessages = {
    submit: "Task is submitted successfully",
    trash: "Task is trashed successfully",
    reject: "Task is rejected successfully",
  };

  return {
    success: actionSuccessMessages[action] || "Action performed successfully",
  };
};
