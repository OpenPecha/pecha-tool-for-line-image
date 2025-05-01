"use server";

import prisma from "@/service/db";

export const getAbbreviations = async (page = 0, pageSize = 10) => {
  try {
    const skip = page * pageSize;

    // Get the requested page of abbreviations
    const abbreviations = await prisma.abbreviation.findMany({
      orderBy: {
        convention: "asc",
      },
      skip,
      take: pageSize,
    });

    // Get the total count for pagination info
    const totalCount = await prisma.abbreviation.count();

    return {
      abbreviations,
      pagination: {
        page,
        pageSize,
        totalCount,
        hasMore: skip + pageSize < totalCount,
      },
    };
  } catch (error) {
    console.error("Error fetching abbreviations:", error);
    return {
      abbreviations: [],
      pagination: {
        page,
        pageSize,
        totalCount: 0,
        hasMore: false,
      },
    };
  }
};

/**
 * Updates an existing abbreviation
 * @param {string} id - The ID of the abbreviation to update
 * @param {string} convention - The new convention text
 * @param {string} expansion - The new expansion text
 * @returns {Promise<Object|null>} - The updated abbreviation or null if not found
 */
export async function updateAbbreviation(id, convention, expansion) {
  try {
    const updatedAbbreviation = await prisma.abbreviation.update({
      where: { id },
      data: {
        convention,
        expansion,
        updatedAt: new Date(),
      },
    });
    return updatedAbbreviation;
  } catch (error) {
    console.error("Error updating abbreviation:", error);
    return null;
  }
}

/**
 * Adds a new abbreviation
 * @param {string} convention - The convention text
 * @param {string} expansion - The expansion text
 * @param {string} image - The image data URL (optional)
 * @returns {Promise<Object|null>} - The created abbreviation or null if failed
 */
export async function addAbbreviation(convention, expansion, image) {
  try {
    const newAbbreviation = await prisma.abbreviation.create({
      data: {
        convention,
        expansion,
        image,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return newAbbreviation;
  } catch (error) {
    console.error("Error adding abbreviation:", error);
    return null;
  }
}

// delete an abbreviation
export const deleteAbbreviation = async (id) => {
  try {
    const deletedAbbreviation = await prisma.abbreviation.delete({
      where: {
        id,
      },
    });
    return deletedAbbreviation;
  } catch (error) {
    console.error("Error deleting abbreviation:", error);
    return null;
  }
};

/**
 * Fetch all abbreviations (convention and expansion only).
 * Returns an array of { convention, expansion } objects.
 */
export async function getAllAbbreviationConventions() {
  try {
    const abbreviations = await prisma.abbreviation.findMany({
      select: {
        convention: true,
        expansion: true,
      },
      orderBy: {
        convention: "asc",
      },
    });
    return abbreviations;
  } catch (error) {
    console.error("Error fetching all abbreviation conventions:", error);
    return [];
  }
}

// search abbreviations
export async function searchAbbreviations(searchTerm) {
  try {
    const abbreviations = await prisma.abbreviation.findMany({
      where: {
        OR: [
          { convention: { contains: searchTerm, mode: "insensitive" } },
          { expansion: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: {
        convention: "asc",
      },
    });
    return abbreviations;
  } catch (error) {
    console.error("Error searching abbreviations:", error);
    return [];
  }
}

/**
 * Get tasks based on state and date range for CSV report generation
 * @param {string} state - The task state to filter by (e.g., "transcribing", "submitted", etc.)
 * @param {string} fromDate - Start date in ISO format (YYYY-MM-DD)
 * @param {string} toDate - End date in ISO format (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of tasks matching the criteria
 */
export async function getTasksForCsvReport(state, fromDate, toDate) {
  try {
    // Build the where condition
    const whereCondition = {
      state: state,
    };

    // Add date filter if dates are provided
    if (fromDate && toDate) {
      // Determine which date field to use based on the state
      let dateField;
      if (state === "transcribing") {
        // For transcribing tasks, use created_at
        dateField = "created_at";
      } else if (state === "submitted") {
        // For submitted tasks, use submitted_at
        dateField = "submitted_at";
      } else if (state === "accepted") {
        // For accepted tasks, use reviewed_at
        dateField = "reviewed_at";
      } else if (state === "finalised") {
        // For finalised tasks, use final_reviewed_at
        dateField = "final_reviewed_at";
      } else if (state === "trashed") {
        // For trashed tasks, use submitted_at (or when they were trashed)
        dateField = "submitted_at";
      }

      // Only add date filter if we have a valid date field
      if (dateField) {
        whereCondition[dateField] = {
          gte: new Date(`${fromDate}T00:00:00Z`),
          lte: new Date(`${toDate}T23:59:59Z`),
        };
      }
    }

    // Query the database
    const tasks = await prisma.task.findMany({
      where: whereCondition,
      include: {
        transcriber: {
          select: { name: true, email: true },
        },
        reviewer: {
          select: { name: true, email: true },
        },
        final_reviewer: {
          select: { name: true, email: true },
        },
        group: {
          select: { name: true },
        },
      },
      orderBy: [{ group_id: "asc" }, { batch_id: "asc" }, { id: "asc" }],
    });

    return tasks;
  } catch (error) {
    console.error("Error fetching tasks for CSV report:", error);
    throw new Error(`Failed to fetch tasks for CSV report: ${error.message}`);
  }
}
