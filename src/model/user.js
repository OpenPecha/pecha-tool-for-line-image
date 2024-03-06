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
    console.error("Failed to retrieve users:", error);
    throw new Error("Failed to retrieve users.");
  }
};

export const createUser = async (formData) => {
  const name = formData.get("name");
  const email = formData.get("email");
  const groupId = formData.get("group_id");
  const role = formData.get("role");
  try {
    // check if username  and email already exists
    const userByName = await prisma.user.findUnique({
      where: {
        name: name,
      },
    });

    const userByEmail = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (userByName && userByEmail) {
      return {
        error: "User already exists with the same username and email",
      };
    } else if (userByName) {
      return {
        error: "User already exists with the same username",
      };
    } else if (userByEmail) {
      return {
        error: "User already exists with the same email",
      };
    }
    // If no matching user was found, you can proceed with user creating new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        group_id: parseInt(groupId),
        role,
      },
    });
    revalidatePath("/dashboard/user");
    // if new user is created, send msg to client side that user is created
    if (newUser) {
      return {
        success: "User created successfully",
      };
    } else {
      return {
        error: "Error creating user",
      };
    }
  } catch (error) {
    //console.log("Error adding a user", error);
    throw new Error(error);
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
    console.log("Failed to delete the user:", error);
    throw new Error("Failed to delete the user.");
  }
};

export const editUser = async (id, formData) => {
  const name = formData.get("name");
  const email = formData.get("email");
  const groupId = formData.get("group_id");
  const role = formData.get("role");
  try {
    // check if username  and email already exists
    const userId = parseInt(id); // Ensure id is converted to an integer
    const userByName = await prisma.user.findUnique({
      where: {
        name: name,
        NOT: {
          id: userId,
        },
      },
    });

    const userByEmail = await prisma.user.findUnique({
      where: {
        email: email,
        NOT: {
          id: userId,
        },
      },
    });

    if (userByName && userByEmail) {
      return {
        error: "User already exists with the same username and email",
      };
    } else if (userByName) {
      return {
        error: "User already exists with the same username",
      };
    } else if (userByEmail) {
      return {
        error: "User already exists with the same email",
      };
    }
    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        email,
        group_id: parseInt(groupId),
        role,
      },
    });
    revalidatePath("/dashboard/user");
    // if user data is edited , send msg to client side that user is created
    if (updatedUser) {
      return {
        success: "User edited successfully",
      };
    } else {
      return {
        error: "Error editing user",
      };
    }
  } catch (error) {
    console.log("Failed to update the user details:", error);
    throw new Error("Failed to update the user details.");
  }
};

export const getUsersByGroup = async (groupId) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        group_id: parseInt(groupId),
        role: "TRANSCRIBER",
      },
    });
    return users;
  } catch (error) {
    console.error("Failed to retrieve users by group:", error);
    throw new Error("Failed to retrieve users by group.");
  }
};
