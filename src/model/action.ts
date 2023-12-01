"use server";

import { formatTime } from "@/lib/formatTime";
import prisma from "@/service/db";
import { $Enums } from "@prisma/client";
import { revalidatePath } from "next/cache";

const ASSIGN_TASKS = 5;
//get user detail if exist
export const getUserDetails = async (username: string) => {
  const userData = await prisma.user.findUnique({
    where: {
      name: username,
    },
    include: {
      group: true,
    },
  });
  if (userData === null) {
    return null;
  }
  return userData;
};

// get task based on username
export const getUserTask = async (username: string) => {
  let userTasks;
  const userData = await getUserDetails(username);
  if (userData === null) {
    return {
      error: "No user found! Please try another with correct username.",
    };
  }
  // if user is found, get the task based on user role
  const { id: userId, group_id: groupId, role } = userData;
  userTasks = await getTasksOrAssignMore(groupId, userId, role);
  const userHistory = await getUserHistory(userId);
  return { userTasks, userData, userHistory };
};

export const getTasksOrAssignMore = async (
  groupId: number,
  userId: number,
  role: $Enums.Role
) => {
  try {
    switch (role) {
      case "TRANSCRIBER":
        // get transcriber assigned tasks
        try {
          const assignedTasks = await prisma.task.findMany({
            where: {
              group_id: groupId,
              state: "transcribing",
              transcriber_id: userId,
            },
            orderBy: {
              id: "asc",
            },
          });
          if (assignedTasks === null) {
            throw new Error("No task found for TRANSCRIBER!.");
          }
          if (assignedTasks.length == 0) {
            // assign some tasks for user when got no task to work on
            let moreTasks = await prisma.task.findMany({
              where: {
                group_id: groupId,
                state: "transcribing",
              },
              orderBy: {
                id: "asc",
              },
              take: ASSIGN_TASKS,
            });
            console.log("moreTasks", moreTasks);
            if (moreTasks.length === 0) {
              return moreTasks;
            } else {
              let newAssignedTaskCount = await prisma.task.updateMany({
                where: {
                  id: { in: moreTasks?.map((task) => task.id) },
                },
                data: {
                  transcriber_id: userId,
                },
              });
              return await prisma.task.findMany({
                where: {
                  group_id: groupId,
                  state: "transcribing",
                  transcriber_id: userId,
                },
                orderBy: {
                  id: "asc",
                },
              });
            }
          } else {
            return assignedTasks;
          }
        } catch (error) {
          // console.log("error", error);
          throw new Error(
            "Error while getting assigned task for TRANSCRIBER! Please try another"
          );
        }
        break;
      case "REVIEWER":
        // get reviwer assigned tasks
        try {
          const assignedTasks = await prisma.task.findMany({
            where: {
              group_id: groupId,
              state: "submitted",
              reviewer_id: userId,
            },
            include: {
              transcriber: true,
            },
            orderBy: {
              id: "asc",
            },
          });
          console.log("assignedTasks", assignedTasks);
          if (assignedTasks === null) {
            throw new Error("No task found for REVIEWER!.");
          }
          if (assignedTasks.length == 0) {
            // assign some tasks for user when got no task to work on
            let moreTasks = await prisma.task.findMany({
              where: {
                group_id: groupId,
                state: "submitted",
              },
              orderBy: {
                id: "asc",
              },
              take: ASSIGN_TASKS,
            });
            console.log("moreTasks", moreTasks);
            if (moreTasks.length === 0) {
              return moreTasks;
            } else {
              let newAssignedTaskCount = await prisma.task.updateMany({
                where: {
                  id: { in: moreTasks?.map((task) => task.id) },
                },
                data: {
                  reviewer_id: userId,
                },
              });
              return await prisma.task.findMany({
                where: {
                  group_id: groupId,
                  state: "submitted",
                  reviewer_id: userId,
                },
                orderBy: {
                  id: "asc",
                },
              });
            }
          } else {
            return assignedTasks;
          }
        } catch (error) {
          //console.log("error", error);
          throw new Error(
            "Error while getting assigned task for REVIEWER! Please try another"
          );
        }
        break;
    }
  } catch (e) {
    //console.log("Error occurred while getting user task:", error);
    throw new Error(e);
  }
};

// get all the history of a user based on userId
export const getUserHistory = async (userId: number) => {
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
        ],
      },
      orderBy: {
        id: "desc",
      },
      take: 20,
    });
    revalidatePath("/");
    return userHistory;
  } catch (error) {
    //console.log("Error getting user history", error);
    throw new Error(error);
  }
};

// to change the state of task based on user action (state machine)
export const changeTaskState = (task, role: $Enums.Role, action: string) => {
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
            transcript:
              changeState.state === "transcribing"
                ? transcript
                : task.transcript,
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
    default:
      break;
  }
};

export const taskToastMsg = async (action: string) => {
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
