import React from "react";
import Link from "next/link";
import { Button } from "flowbite-react";

const Dashboard = () => {
  const links = ["group", "user", "task"];
  return (
    <div className="h-screen flex flex-col sm:flex-row justify-center items-center space-y-5 space-x-0 sm:space-y-0 sm:space-x-5">
      {links.map((link) => (
        <Button
          key={link}
          href={`/dashboard/${link}`}
          size={"lg"}
          className="bg-teal-400 text-black font-semibold w-1/2 sm:w-1/5"
        >
          {link}
        </Button>
      ))}
    </div>
  );
};

export default Dashboard;
