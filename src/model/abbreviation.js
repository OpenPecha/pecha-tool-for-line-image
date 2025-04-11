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
