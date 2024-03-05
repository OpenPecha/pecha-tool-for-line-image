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
    throw new Error("Failed to retrieve tasks.");
  }
};

//get the total count of tasks
export const getTotalTaskCount = async () => {
  try {
    const totalTask = await prisma.task.count({});
    return totalTask;
  } catch (error) {
    console.error("Error fetching the count of lists:", error);
    throw new Error("Failed to retrieve the count of tasks.");
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
        const batch_id = row.batch_id;

        // Return task data as an object
        return {
          group_id: parseInt(groupId),
          inference_transcript: inference_transcript,
          id: id,
          url: url,
          batch_id: batch_id,
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
  const roleConditions = {
    TRANSCRIBER: ["submitted", "accepted"],
    REVIEWER: ["accepted", "finalised"],
    FINAL_REVIEWER: ["finalised"],
  };

  const stateConditions = roleConditions[role] || [];
  if (stateConditions.length === 0) {
    console.error(`Invalid role: ${role}`);
    throw new Error(`Invalid role provided: ${role}`);
  }

  try {
    const completedTaskCount = await prisma.task.count({
      where: {
        [`${role.toLowerCase()}_id`]: parseInt(id),
        state: { in: stateConditions },
      },
    });
    return completedTaskCount;
  } catch (error) {
    console.error(
      `Error fetching completed task count for role ${role}:`,
      error
    );
    throw new Error(`Failed to fetch completed task count for role ${role}.`);
  }
};

// get user progress based on the role, user id and group id
export const UserProgressStats = async (id, role, groupId) => {
  try {
    const completedTaskCount = await getCompletedTaskCount(id, role);
    const totalTaskCount = await prisma.task.count({
      where: {
        group_id: parseInt(groupId),
        [`${role.toLowerCase()}_id`]: parseInt(id),
      },
    });
    // Assuming totalTaskPassed is meant to count tasks that have moved beyond the initial state for both TRANSCRIBER and REVIEWER roles
    const totalTaskPassed = await prisma.task.count({
      where: {
        group_id: parseInt(groupId),
        [`${role.toLowerCase()}_id`]: parseInt(id),
        state:
          role === "TRANSCRIBER"
            ? { in: ["accepted", "finalised"] }
            : "finalised",
      },
    });

    return { completedTaskCount, totalTaskCount, totalTaskPassed };
  } catch (error) {
    console.error(
      `Error fetching user progress stats for role ${role}:`,
      error
    );
    throw new Error(`Failed to fetch user progress stats for role ${role}.`);
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
    if (task.state === "finalised" || task.state === "trashed") {
      newState = "accepted";
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
