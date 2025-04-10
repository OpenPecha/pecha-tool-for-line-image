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
        hasMore: skip + pageSize < totalCount
      }
    };
  } catch (error) {
    console.error("Error fetching abbreviations:", error);
    return {
      abbreviations: [],
      pagination: {
        page,
        pageSize,
        totalCount: 0,
        hasMore: false
      }
    };
  }
};

// add new abbreviation to database
export const addAbbreviation = async (convention, expansion, image) => {
  try {
    const newAbbreviation = await prisma.abbreviation.create({
      data: {
        convention,
        expansion,
        image,
      },
    });
    return newAbbreviation;
  } catch (error) {
    console.error("Error adding abbreviation:", error);
    return null;
  }
};

// update a existing abbreviation (convention and expansion)
export const updateAbbreviation = async (id, convention, expansion) => {
  try {
    const updatedAbbreviation = await prisma.abbreviation.update({
      where: {
        id,
      },
      data: {
        convention,
        expansion,
      },
    });
    return updatedAbbreviation;
  } catch (error) {
    console.error("Error updating abbreviation:", error);
    return null;
  }
};

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
