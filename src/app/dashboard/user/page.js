import React from "react";

import UserDashboard from "./UserDashboard";
import { getAllUser } from "@/model/user";
import { getAllGroup } from "@/model/group";

const User = async () => {
  const users = await getAllUser();
  const groups = await getAllGroup();

  return (
    <>
      <UserDashboard users={users} groups={groups} />
    </>
  );
};

export default User;
