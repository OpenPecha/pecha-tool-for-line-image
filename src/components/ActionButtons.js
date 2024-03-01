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
    <div className="fixed bottom-0 mt-4 flex gap-1 border shadow-sm p-2">
      <ButtonWithTooltip
        id="submit-button"
        bgColor="bg-[#4fd364]"
        tooltipText="Submit(Alt + a)"
        icon={BsCheckLg}
        text={lang.submit}
        onClickAction={() => updateTaskAndIndex("submit", transcript, tasks[0])}
      />
      {role !== "TRANSCRIBER" && (
        <ButtonWithTooltip
          id="reject-button"
          bgColor="bg-[#f74c4a]"
          tooltipText="Reject(Alt + x)"
          icon={BsXLg}
          text={lang.reject}
          onClickAction={() =>
            updateTaskAndIndex("reject", transcript, tasks[0])
          }
        />
      )}

      {role === "TRANSCRIBER" && (
        <ButtonWithTooltip
          id="trash-button"
          bgColor="bg-[#b9b9b9]"
          tooltipText="Trash(Alt + t)"
          icon={BsTrash}
          text={lang.trash}
          onClickAction={() =>
            updateTaskAndIndex("trash", transcript, tasks[0])
          }
        />
      )}
    </div>
  );
};

const ButtonWithTooltip = ({
  id,
  bgColor,
  tooltipText,
  icon: Icon,
  text,
  onClickAction,
}) => (
  <div className="md:tooltip tooltip-top" data-tip={tooltipText}>
    <button
      id={id}
      type="button"
      className={`focus:outline-none text-white ${bgColor} font-medium text-md w-32 md:w-36 h-full p-4 md:py-9`}
      onClick={onClickAction}
    >
      <div className="flex gap-2 flex-col items-center">
        <Icon width="5rem" />
        <p>{text}</p>
      </div>
    </button>
  </div>
);

export default ActionButtons;
