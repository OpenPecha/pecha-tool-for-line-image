"use client";
import { useState } from "react";
import BurgerIcon from "./BurgerIcon";
export default function Sidebar({ children }) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      {showSidebar ? (
        <button
          className="fixed z-50 flex items-center text-3xl text-white cursor-pointer right-5 bottom-1/2"
          onClick={() => setShowSidebar((prev) => !prev)}
        >
          ❌
        </button>
      ) : (
        <BurgerIcon setShowSidebar={setShowSidebar} />
      )}

      <div
        className={`bottom-0 right-0 w-[90vw] h-[50vh] md:w-[50vw] bg-[#54606e] md:p-5 p-1 text-white fixed z-40  ease-in-out duration-300 ${
          showSidebar ? "translate-x-0 " : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col space-y-2">{children}</div>
      </div>
    </>
  );
}
