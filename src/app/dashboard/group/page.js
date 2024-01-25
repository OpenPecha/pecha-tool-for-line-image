import React from "react";
import GroupDashboard from "./GroupDashboard";
import { getAllGroup } from "@/model/group";
import { redirect } from "next/navigation";
import { getUserDetails } from "@/model/action";
export const dynamic = "force-dynamic";

const Group = async ({ searchParams }) => {
  let { session } = searchParams;
  if (!session) return redirect("/");
  let user = await getUserDetails(session);
  if (!user) return redirect("/");
  const groupList = await getAllGroup();

  return (
    <>
      <GroupDashboard groupList={groupList} user={user} />
    </>
  );
};

export default Group;
