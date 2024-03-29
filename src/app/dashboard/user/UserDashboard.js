"use client";

import React, { useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import DashboardBtn from "@/components/DashboardBtn";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import { removeUser } from "@/model/user";
import toast from "react-hot-toast";

const UserDashboard = ({ users, groups }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [showRemoved, setShowRemoved] = useState(false);

  const handleRemoveUser = async (user) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user ${user.name}?`
    );
    if (confirmDelete) {
      const msg = await removeUser(user);
      if (msg?.success) {
        toast.success(msg.success);
      }
    }
  };

  const handleEditUser = async (userRow) => {
    setSelectedRow(userRow);
    window.edit_modal.showModal();
  };

  return (
    <>
      <div className="my-10 gap-4 flex justify-center">
        <DashboardBtn
          label="Create"
          icon={<AiOutlinePlus />}
          onClick={() => window.add_modal.showModal()}
        />
        <DashboardBtn
          label="Show removed"
          onClick={() => setShowRemoved(!showRemoved)}
        />
      </div>
      <div className="flex justify-center items-center my-10">
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg w-11/12 md:w-4/5 max-h-[80vh]">
          <table className="table">
            <thead className="text-sm md:text-base uppercase">
              <tr>
                <th className="px-6 py-3">User Id</th>
                <th className="px-6 py-3">Group Id</th>
                <th className="px-6 py-3">Group Name</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users
                ?.filter(
                  (user) => showRemoved || !user.name.startsWith("removed")
                )
                .map((user) => (
                  <tr key={user.id} className="text-sm md:text-base">
                    <th scope="row" className="px-6 py-4">
                      {user.id}
                    </th>
                    <td className="px-6 py-4">{user.group_id}</td>
                    <td className="px-6 py-4">{user.group?.name}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.role}</td>
                    <td className="flex items-center px-6 py-4 space-x-3">
                      <a
                        href="#"
                        className="font-medium text-info hover:underline"
                        onClick={() => handleEditUser(user)}
                      >
                        Edit
                      </a>
                      <a
                        href="#"
                        className="font-medium text-error hover:underline"
                        onClick={() => handleRemoveUser(user)}
                      >
                        Remove
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AddUserModal groups={groups} />
        <EditUserModal groups={groups} selectedRow={selectedRow} />
      </div>
    </>
  );
};

export default UserDashboard;
