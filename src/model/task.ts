"use server";

import prisma from "@/service/db";
import { $Enums } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getCompletedTaskCount = async (
  id: string,
  role: $Enums.Role
): Promise<number | undefined> => {
  try {
    switch (role) {
      case "TRANSCRIBER":
        try {
          const completedTaskCount = await prisma.task.count({
            where: {
              transcriber_id: parseInt(id),
              state: { in: ["submitted", "accepted"] },
            },
          });
          return completedTaskCount;
          break;
        } catch (error) {
          throw new Error(error);
        }
      case "REVIEWER":
        try {
          const completedTaskCount = await prisma.task.count({
            where: {
              reviewer_id: parseInt(id),
              state: { in: ["accepted"] },
            },
          });
          return completedTaskCount;
          break;
        } catch (error) {
          throw new Error(error);
        }
      default:
        break;
    }
  } catch (error) {
    throw new Error(error);
  }
};

// get user progress based on the role, user id and group id
export const UserProgressStats = async (
  id: string,
  role: $Enums.Role,
  groupId: string
) => {
  let completedTaskCount = 0;
  let totalTaskCount = 0;
  let totalTaskPassed = 0;
  try {
    completedTaskCount = await getCompletedTaskCount(id, role);
    totalTaskCount = await prisma.task.count({
      where: {
        OR: [
          {
            group_id: parseInt(groupId),
            transcriber_id: parseInt(id),
          },
          {
            group_id: parseInt(groupId),
            reviewer_id: parseInt(id),
          },
        ],
      },
    });
    totalTaskPassed = await prisma.task.count({
      where: {
        OR: [
          {
            group_id: parseInt(groupId),
            transcriber_id: parseInt(id),
            state: { in: ["accepted"] },
          },
        ],
      },
    });
    //console.log("completedTaskCount", completedTaskCount, "totalTaskCount", totalTaskCount);
    return { completedTaskCount, totalTaskCount, totalTaskPassed };
  } catch (error) {
    throw new Error(error);
  }
};

export const getTaskWithRevertedState = async (task, role) => {
  try {
    let newState;
    if (
      task.state === "submitted" ||
      (role === "TRANSCRIBER" && task.state === "trashed")
    ) {
      newState = "transcribing";
    }
    if (
      task.state === "accepted" ||
      (role === "REVIEWER" && task.state === "trashed")
    ) {
      newState = "submitted";
    }
    const updatedTask = await prisma.task.update({
      where: {
        id: parseInt(task.id),
      },
      data: {
        state: newState,
      },
      include: {
        transcriber: true,
        reviewer: true,
      },
    });
    revalidatePath("/");
    return updatedTask;
  } catch (error) {
    console.error("Error getting reverted state task:", error);
    throw new Error(error);
  }
};
