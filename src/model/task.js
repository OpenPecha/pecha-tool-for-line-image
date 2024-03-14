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
    console.error("Failed to retrieve tasks:", error);
    throw new Error("Failed to retrieve tasks.");
  }
};

//get the total count of tasks
export const getTotalTaskCount = async () => {
  try {
    const totalTask = await prisma.task.count({});
    return totalTask;
  } catch (error) {
    console.error("Failed to retrieve the count of tasks:", error);
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
    console.error(`Failed to retrieve completed task count: ${error.message}`);
    throw new Error(
      `Failed to retrieve completed task count: ${error.message}`
    );
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
    // total task which are reviewed by reviewer and finalised by final reviewer
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
      `Failed to fetch user progress stats for role ${role}:`,
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
    console.error("Failed to reverted the state of task:", error);
    throw new Error("Failed to revert the state of the task.");
  }
};

export const getUserSpecificTasksCount = async (id, dates) => {
  const { from: fromDate, to: toDate } = dates;

  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: { role: true },
  });

  if (!user) throw new Error(`User with ID ${id} not found.`);

  // Define the base condition for task counting based on the user's role
  let baseWhereCondition = {
    [`${user.role.toLowerCase()}_id`]: parseInt(id),
    state:
      user.role === "TRANSCRIBER"
        ? { in: ["submitted", "accepted", "finalised"] }
        : user.role === "REVIEWER"
        ? { in: ["accepted", "finalised"] }
        : { in: ["finalised"] }, // Defaults to FINAL_REVIEWER case
  };

  // Extend the base condition with date filters if both fromDate and toDate are provided
  if (fromDate && toDate) {
    const dateFieldName =
      user.role === "TRANSCRIBER"
        ? "submitted_at"
        : user.role === "REVIEWER"
        ? "reviewed_at"
        : "final_reviewed_at"; // Applies to REVIEWER and FINAL_REVIEWER
    baseWhereCondition[dateFieldName] = {
      gte: new Date(fromDate),
      lte: new Date(toDate),
    };
  }

  try {
    const userTaskCount = await prisma.task.count({
      where: baseWhereCondition,
    });

    return userTaskCount;
  } catch (error) {
    console.error(`Error fetching tasks count for user with ID ${id}:`, error);
    throw new Error("Failed to fetch user-specific tasks count.");
  }
};

export const getTranscriberTaskList = async (id, dates) => {
  const { from: fromDate, to: toDate } = dates;
  try {
    if (fromDate && toDate) {
      const filteredTasks = await prisma.task.findMany({
        where: {
          transcriber_id: id,
          reviewed_at: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        },
        select: {
          transcript: true,
          reviewed_transcript: true,
          state: true,
        },
      });
      return filteredTasks;
    } else {
      const filteredTasks = await prisma.task.findMany({
        where: {
          transcriber_id: id,
        },
        select: {
          transcript: true,
          reviewed_transcript: true,
          state: true,
        },
      });
      return filteredTasks;
    }
  } catch (error) {
    console.error("Error fetching transcriber task list:", error);
    throw new Error("Failed to fetch transcriber task list.");
  }
};

export const getTaskReviewedBasedOnSubmitted = async (id, dates) => {
  const { from: fromDate, to: toDate } = dates;
  let taskReviewedBasedOnSubmitted;
  if (fromDate && toDate) {
    taskReviewedBasedOnSubmitted = await prisma.task.findMany({
      where: {
        transcriber_id: parseInt(id),
        state: { in: ["accepted", "finalised"] },
        submitted_at: {
          gte: new Date(fromDate).toISOString(),
          lte: new Date(toDate).toISOString(),
        },
      },
    });
  } else {
    taskReviewedBasedOnSubmitted = await prisma.task.findMany({
      where: {
        transcriber_id: parseInt(id),
        state: { in: ["accepted", "finalised"] },
      },
    });
  }
  return taskReviewedBasedOnSubmitted;
};

export const getReviewerTaskCount = async (id, dates, reviewerObj) => {
  const { from: fromDate, to: toDate } = dates;
  const reviewerId = parseInt(id);

  // Construct the base query condition
  const baseWhere = {
    reviewer_id: reviewerId,
    reviewed_at:
      fromDate && toDate
        ? {
            gte: new Date(fromDate).toISOString(),
            lte: new Date(toDate).toISOString(),
          }
        : undefined,
  };

  try {
    // Count all reviewed tasks (either accepted or finalised)
    const reviewedStats = await prisma.task.aggregate({
      where: {
        ...baseWhere,
        state: { in: ["accepted", "finalised"] },
      },
      _count: true,
    });
    const noReviewed = reviewedStats._count || 0;
    // Count tasks in accepted state
    const noAccepted = await prisma.task.count({
      where: {
        ...baseWhere,
        state: "accepted",
      },
    });

    // Count tasks in finalised state
    const noFinalised = await prisma.task.count({
      where: {
        ...baseWhere,
        state: "finalised",
      },
    });

    return {
      noReviewed,
      noAccepted,
      noFinalised,
    };
  } catch (error) {
    console.error(`Error fetching reviewer task counts:`, error);
    throw new Error(`Failed to fetch reviewer task counts. ${error.message}`);
  }
};

export const getReviewerTaskList = async (id, dates) => {
  const { from: fromDate, to: toDate } = dates;
  try {
    if (fromDate && toDate) {
      const filteredTasks = await prisma.task.findMany({
        where: {
          reviewer_id: id,
          reviewed_at: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        },
        select: {
          state: true,
          reviewed_transcript: true,
          final_reviewed_transcript: true,
        },
      });
      return filteredTasks;
    } else {
      const filteredTasks = await prisma.task.findMany({
        where: {
          reviewer_id: id,
        },
        select: {
          state: true,
          reviewed_transcript: true,
          final_reviewed_transcript: true,
        },
      });
      return filteredTasks;
    }
  } catch (error) {
    throw new Error(error);
  }
};

export const getFinalReviewerTaskList = async (id, dates) => {
  const { from: fromDate, to: toDate } = dates;
  try {
    if (fromDate && toDate) {
      const filteredTasks = await prisma.task.findMany({
        where: {
          final_reviewer_id: id,
          final_reviewed_at: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        },
        select: {
          audio_duration: true,
          state: true,
        },
      });
      return filteredTasks;
    } else {
      const filteredTasks = await prisma.task.findMany({
        where: {
          final_reviewer_id: id,
        },
        select: {
          audio_duration: true,
          state: true,
        },
      });
      return filteredTasks;
    }
  } catch (error) {
    throw new Error(error);
  }
};

export const getFinalReviewerTaskCount = async (
  id,
  dates,
  finalReviewerObj
) => {
  const { from: fromDate, to: toDate } = dates;
  try {
    if (fromDate && toDate) {
      finalReviewerObj.noFinalised = await prisma.task.count({
        where: {
          final_reviewer_id: parseInt(id),
          state: "finalised",
          final_reviewed_at: {
            gte: new Date(fromDate).toISOString(),
            lte: new Date(toDate).toISOString(),
          },
        },
      });
    } else {
      finalReviewerObj.noFinalised = await prisma.task.count({
        where: {
          final_reviewer_id: parseInt(id),
          state: "finalised",
        },
      });
    }
    return finalReviewerObj;
  } catch (error) {
    console.error(`Error fetching final reviewer task counts:`, error);
    throw new Error("Failed to fetch final reviewer task counts.");
  }
};
