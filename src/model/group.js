"use server";

import prisma from "@/service/db";
import { revalidatePath } from "next/cache";

// Fetches all groups with a count of their tasks and users
export const getAllGroup = async () => {
  try {
    const allGroup = await prisma.group.findMany({
      include: {
        _count: {
          select: { tasks: true, users: true },
        },
      },
      orderBy: {
        id: "asc",
      },
    });
    return allGroup;
  } catch (error) {
    console.error("Error getting all group:", error);
    throw new Error("Failed to retrieve groups.");
  }
};

// Creates a new group with the given name from formData
export const createGroup = async (formData) => {
  const groupName = formData.get("name");
  try {
    const newGroup = await prisma.group.create({
      data: {
        name: groupName,
      },
    });
    revalidatePath("/dashboard/group");
    return newGroup;
  } catch (error) {
    console.error("Error creating a group", error);
    throw new Error("Failed to create a new group.");
  }
};

// Deletes a group by its ID
export const deleteGroup = async (id) => {
  try {
    const group = await prisma.group.delete({
      where: {
        id,
      },
    });
    revalidatePath("/dashboard/group");
    return group;
  } catch (error) {
    console.error("Error deleting a group", error);
    throw new Error("Failed to delete the group.");
  }
};

export const editGroup = async (id, formData) => {
  const groupName = formData.get("name");
  try {
    const group = await prisma.group.update({
      where: {
        id,
      },
      data: {
        name: groupName,
      },
    });
    revalidatePath("/dashboard/group");
    return group;
  } catch (error) {
    console.error("Error updating a group", error);
    throw new Error("Failed to update the group.");
  }
};
