import React from "react";
import GroupDashboard from "./GroupDashboard";
import { getAllGroup } from "@/model/group";
import { redirect } from "next/navigation";
import { getUserDetails } from "@/model/action";
export const dynamic = "force-dynamic";

const Group = async () => {
  const groupList = await getAllGroup();

  return (
    <>
      <GroupDashboard groupList={groupList} />
    </>
  );
};

export default Group;
