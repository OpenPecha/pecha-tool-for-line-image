"use client";
import React from "react";
import { BsCheckLg, BsXLg, BsTrash } from "react-icons/bs";
import { useContext, useEffect } from "react";
import AppContext from "./AppContext";

const ActionButtons = ({ updateTaskAndIndex, tasks, transcript, role }) => {
  // a = 65 submit, x = 88 reject , s = 83 save, t = 84 trash
  const value = useContext(AppContext);
  let { lang } = value;

  useEffect(() => {
    // Add event listener for keyboard shortcuts
    window.addEventListener("keydown", handleKeyPress);
    // Remove the event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  const handleKeyPress = (e) => {
    // Alt/Option + a = submit, Alt/Option + x reject , Alt/Option + s = save, Alt/Option + t = trash
    if (e.altKey && e.keyCode === 65) {
      document.getElementById("submit-button").click();
      return;
    } else if (e.altKey && e.keyCode === 88) {
      document.getElementById("reject-button").click();
      return;
    } else if (e.altKey && e.keyCode === 84) {
      document.getElementById("trash-button").click();
      return;
    }
  };

  return (
    <>
      <div className="fixed bottom-0 mt-4 flex gap-1 border shadow-sm p-2">
        <div className="md:tooltip tooltip-top" data-tip="Submit(Alt + a)">
          <button
            id="submit-button"
            type="button"
            className="focus:outline-none text-white bg-[#4fd364] font-medium text-md w-32 md:w-36 h-full p-4 md:py-9"
            onClick={() => updateTaskAndIndex("submit", transcript, tasks[0])}
          >
            <div className="flex gap-2 flex-col items-center">
              <BsCheckLg width="5rem" />
              <p>{lang.submit}</p>
            </div>
          </button>
        </div>
        {role !== "TRANSCRIBER" && (
          <div className="md:tooltip tooltip-top" data-tip="Reject(Alt + x)">
            <button
              id="reject-button"
              type="button"
              className="focus:outline-none text-white bg-[#f74c4a] font-medium text-md w-32 md:w-36 h-full p-4 md:py-9"
              onClick={() => updateTaskAndIndex("reject", transcript, tasks[0])}
            >
              <div className="flex gap-2 flex-col items-center">
                <BsXLg />
                <p>{lang.reject}</p>
              </div>
            </button>
          </div>
        )}
        {role === "TRANSCRIBER" && (
          <div className="md:tooltip tooltip-top" data-tip="Trash(Alt + t)">
            <button
              id="trash-button"
              type="button"
              className="focus:outline-none text-white bg-[#b9b9b9] font-medium text-md w-32 md:w-36 h-full p-4 md:py-9"
              onClick={() => updateTaskAndIndex("trash", transcript, tasks[0])}
            >
              <div className="flex gap-2 flex-col items-center">
                <BsTrash />
                <p>{lang.trash}</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ActionButtons;
