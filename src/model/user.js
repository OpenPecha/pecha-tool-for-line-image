"use server";

import prisma from "@/service/db";
import { revalidatePath } from "next/cache";

export const getAllUser = async () => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            transcriber_task: true,
            reviewer_task: true,
            final_reviewer_task: true,
          },
        },
        group: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    return users;
  } catch (error) {
    console.error("Error getting all the user:", error);
    throw new Error(error);
  }
};

export const createUser = async (formData) => {
  const name = formData.get("name");
  const email = formData.get("email");
  const groupId = parseInt(formData.get("group_id"));
  const role = formData.get("role");
  try {
    if (await checkUserExists(name, email)) {
      return { error: "User already exists with the same username or email" };
    }
    // If no matching user was found, you can proceed with user creating new user
    const newUser = await prisma.user.create({
      data: { name, email, group_id: groupId, role },
    });
    revalidatePath("/dashboard/user");
    return { success: "User created successfully" };
  } catch (error) {
    console.error("Error creating a user", error);
    throw new Error("Failed to create user.");
  }
};

// Abstracting the duplicate user check into a reusable function
async function checkUserExists(name, email, excludeUserId = null) {
  let userQuery = {
    OR: [{ name }, { email }],
  };

  if (excludeUserId) {
    userQuery.AND = { NOT: { id: excludeUserId } };
  }

  const existingUsers = await prisma.user.findMany({
    where: userQuery,
    select: { id: true }, // Only fetch the id to check existence
  });

  return existingUsers.length > 0;
}

export const editUser = async (id, formData) => {
  const userId = parseInt(id);
  const name = formData.get("name");
  const email = formData.get("email");
  const groupId = parseInt(formData.get("group_id"));
  const role = formData.get("role");

  try {
    if (await checkUserExists(name, email, userId)) {
      return { error: "Another user exists with the same username or email" };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email, group_id: groupId, role },
    });
    revalidatePath("/dashboard/user");
    return { success: "User updated successfully" };
  } catch (error) {
    console.error("Error updating a user details", error);
    throw new Error("Failed to update user.");
  }
};

export const deleteUser = async (id) => {
  try {
    const user = await prisma.user.delete({
      where: {
        id,
      },
    });
    revalidatePath("/dashboard/user");
    return user;
  } catch (error) {
    console.error("Error deleting a user", error);
    throw new Error("Failed to delete user.");
  }
};

export const getUsersByGroup = async (groupId) => {
  try {
    const users = await prisma.user.findMany({
      where: { group_id: parseInt(groupId), role: "TRANSCRIBER" },
    });
    return users;
  } catch (error) {
    console.error("Error getting users by group:", error);
    throw new Error("Failed to retrieve users by group.");
  }
};
