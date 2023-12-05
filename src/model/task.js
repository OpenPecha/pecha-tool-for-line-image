"use server";

import prisma from "@/service/db";
import { revalidatePath } from "next/cache";

// get all tasks basd on the search params
export const getAllTask = async (limit, skip) => {
  try {
    const tasks = await prisma.task.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        id: "desc",
      },
    });
    return tasks;
  } catch (error) {
    console.error("Error getting all the tasks:", error);
    throw new Error(error);
  }
};

//get the total count of tasks
export const getTotalTaskCount = async () => {
  try {
    const totalTask = await prisma.task.count({});
    return totalTask;
  } catch (error) {
    console.error("Error fetching the count of lists:", error);
    throw new Error(error);
  }
};

export async function createTasksFromCSV(formData) {
  let tasksToCreate = [];
  try {
    const groupId = formData.get("group_id");
    const tasksFile = formData.get("tasks");
    const parsedTasksFile = JSON.parse(tasksFile);
    // Create an array to hold task data
    tasksToCreate = await Promise.all(
      parsedTasksFile.map((row) => {
        // Extract data from the CSV row
        const inference_transcript = row.inference_transcript;
        const id = row.id;
        const url = row.url;

        // Return task data as an object
        return {
          group_id: parseInt(groupId),
          inference_transcript: inference_transcript,
          id: id,
          url: url,
        };
      })
    );
  } catch (error) {
    console.error("Error parsing tasks file:", error);
    return { count: 0 };
  }

  try {
    // Use createMany to insert all tasks at once
    const tasksCreated = await prisma.task.createMany({
      data: tasksToCreate,
      skipDuplicates: true,
    });
    revalidatePath("/dashboard/task");
    return tasksCreated;
  } catch (error) {
    console.error("Error creating tasks:", error);
    return { count: 0 };
  }
}

export const getCompletedTaskCount = async (id, role) => {
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
export const UserProgressStats = async (id, role, groupId) => {
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
        id: task.id,
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
