import React from "react";
import UserDashboard from "./UserDashboard";
import { getAllUser } from "@/model/user";
import { getAllGroup } from "@/model/group";
import { getUserDetails } from "@/model/action";
export const dynamic = "force-dynamic";

const User = async ({ searchParams }) => {
  let { session } = searchParams;
  if (!session) return redirect("/");
  let user = await getUserDetails(session);
  if (!user) return redirect("/");
  const users = await getAllUser();
  const groups = await getAllGroup();

  return (
    <>
      <UserDashboard users={users} groups={groups} user={user} />
    </>
  );
};

export default User;
