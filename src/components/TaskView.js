"use client";

import { getTasksOrAssignMore, updateTask } from "@/model/action";
import { getAllAbbreviationConventions } from "@/model/abbreviation";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserProgressStats } from "@/model/task";
import Sidebar from "@/components/sidebar/Sidebar";
import toast from "react-hot-toast";
import AppContext from "./AppContext";
import DisplayImage from "@/components/DisplayImage";
import TipTap from "@/components/TipTap";
import { useEditor } from "@tiptap/react";
import { Color } from "@tiptap/extension-color";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import TextStyle from "@tiptap/extension-text-style";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import AbbreviationList from "@/components/abbreviation/AbbreviationList";
import { UnderlineTibetanWords } from "./UnderlineTibetanWords";

// Custom hook for user progress stats
function useUserProgressStats(userId, role, groupId) {
  const [userTaskStats, setUserTaskStats] = useState({
    completedTaskCount: 0,
    totalTaskCount: 0,
    totalTaskPassed: 0,
  });

  const getUserProgress = useCallback(async () => {
    const { completedTaskCount, totalTaskCount, totalTaskPassed } =
      await UserProgressStats(userId, role, groupId);
    setUserTaskStats({ completedTaskCount, totalTaskCount, totalTaskPassed });
  }, [userId, role, groupId]);

  return [userTaskStats, getUserProgress];
}

const TaskView = ({ tasks, userDetail, language, userHistory }) => {
  // --- State ---
  const [languageSelected, setLanguageSelected] = useState("bo");
  const lang = language[languageSelected];
  const [taskList, setTaskList] = useState(tasks);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAbbreviationSidebarOpen, setIsAbbreviationSidebarOpen] =
    useState(false);
  const [abbreviationMap, setAbbreviationMap] = useState(new Map());

  const currentTimeRef = useRef(null);
  const { id: userId, group_id: groupId, role } = userDetail;

  // --- User Progress ---
  const [userTaskStats, getUserProgress] = useUserProgressStats(
    userId,
    role,
    groupId
  );

  // --- Helpers ---
  const getLastTaskIndex = useCallback(
    () => (taskList.length !== 0 ? taskList.length - 1 : 0),
    [taskList]
  );

  // --- Initialize transcript based on role and task ---
  const initializeTranscript = useCallback(() => {
    if (!taskList?.length) {
      setTranscript("");
      return;
    }
    const task = taskList[0];
    switch (role) {
      case "TRANSCRIBER":
        setTranscript(task.transcript || task.inference_transcript || "");
        break;
      case "REVIEWER":
        setTranscript(task.reviewed_transcript || task.transcript || "");
        break;
      case "FINAL_REVIEWER":
        setTranscript(
          task.final_reviewed_transcript || task.reviewed_transcript || ""
        );
        break;
      default:
        setTranscript("");
    }
  }, [taskList, role]);

  // --- Effects ---
  useEffect(() => {
    getUserProgress();
    currentTimeRef.current = new Date().toISOString();
    if (taskList?.length) {
      setIsLoading(false);
      initializeTranscript();
    } else {
      setIsLoading(false);
      setTranscript("");
    }
  }, [taskList, getUserProgress, initializeTranscript]);

  useEffect(() => {
    async function fetchAbbreviations() {
      // Use the server action directly
      const data = await getAllAbbreviationConventions();
      setAbbreviationMap(
        new Map(data.map((item) => [item.convention, item.expansion]))
      );
    }
    fetchAbbreviations();
  }, []);

  // --- Editor ---
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      TextStyle,
      Color,
      HardBreak,
      History,
      UnderlineTibetanWords.configure({ conventionMap: abbreviationMap }),
    ],
    onUpdate: ({ editor }) => setTranscript(editor.getHTML()),
    editable: true,
    editorProps: { attributes: { class: "p-2 focus-within:outline-none" } },
  });

  // --- Update extension when abbreviationMap changes ---
  useEffect(() => {
    if (!editor || abbreviationMap.size === 0) return;
    const underlineTibetanExtension = editor.extensionManager.extensions.find(
      (ext) => ext.name === "underlineTibetanWords"
    );
    if (underlineTibetanExtension) {
      underlineTibetanExtension.options.conventionMap = abbreviationMap;
      editor.view.dispatch(editor.state.tr); // force re-render
    }
  }, [editor, abbreviationMap]);

  // --- Tooltip state ---
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    convention: "",
    expansion: "",
    from: null,
    to: null,
  });

  // Tooltip ref to track when mouse leaves tooltip
  const tooltipRef = useRef(null);

  // --- Tooltip logic for underlined words ---
  useEffect(() => {
    if (!editor) return;

    const handleMouseOver = (e) => {
      const target = e.target;
      if (target.classList.contains("underline-tibetan-word")) {
        const convention = target.dataset.convention;
        const expansion = target.dataset.expansion;
        const rect = target.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY,
          convention,
          expansion,
          from: parseInt(target.dataset.abbrFrom, 10),
          to: parseInt(target.dataset.abbrTo, 10),
        });
      }
    };

    const handleMouseOut = (e) => {
      // Check if the mouse is moving to the tooltip
      const relatedTarget = e.relatedTarget;
      if (
        relatedTarget &&
        (relatedTarget.closest(".tibetan-tooltip") ||
          relatedTarget.classList.contains("underline-tibetan-word"))
      ) {
        return; // Don't hide if moving to tooltip or between underlined words
      }
      setTooltip((t) => ({ ...t, visible: false }));
    };

    const dom = editor.view.dom;
    dom.addEventListener("mouseover", handleMouseOver);
    dom.addEventListener("mouseout", handleMouseOut);

    return () => {
      dom.removeEventListener("mouseover", handleMouseOver);
      dom.removeEventListener("mouseout", handleMouseOut);
    };
  }, [editor, abbreviationMap]);

  // Handle tooltip events
  useEffect(() => {
    const currentTooltip = tooltipRef.current;
    if (tooltip.visible && currentTooltip) {
      const handleTooltipMouseLeave = () => {
        setTooltip((t) => ({ ...t, visible: false }));
      };

      currentTooltip.addEventListener("mouseleave", handleTooltipMouseLeave);

      return () => {
        currentTooltip.removeEventListener(
          "mouseleave",
          handleTooltipMouseLeave
        );
      };
    }
  }, [tooltip.visible]);

  // --- Accept handler ---
  const handleAcceptAbbreviation = useCallback(() => {
    if (!editor || !tooltip.from || !tooltip.to) return;
    editor.commands.insertContentAt(
      { from: tooltip.from, to: tooltip.to },
      tooltip.expansion
    );
    setTooltip((t) => ({ ...t, visible: false }));
  }, [editor, tooltip]);

  // --- Task Update Handler ---
  const updateTaskAndIndex = useCallback(
    async (action, transcript, task) => {
      let temp_transcript = transcript;
      try {
        const { id } = task;
        if (role === "FINAL_REVIEWER" && action === "submit") {
          temp_transcript = editor.getText();
        }
        const { msg, updatedTask } = await updateTask(
          action,
          id,
          temp_transcript,
          task,
          role,
          currentTimeRef.current
        );
        if (msg?.error) {
          toast.error(msg.error);
        } else {
          toast.success(msg.success);
        }
        if (action === "submit") {
          getUserProgress();
        }
        if (getLastTaskIndex() !== 0) {
          setTaskList((prev) => prev.filter((task) => task.id !== id));
          if (action === "submit") {
            currentTimeRef.current = new Date().toISOString();
          }
        } else {
          const moreTask = await getTasksOrAssignMore(groupId, userId, role);
          setIsLoading(true);
          setTaskList(moreTask);
        }
      } catch (error) {
        throw new Error(error);
      }
    },
    [role, editor, getUserProgress, getLastTaskIndex, groupId, userId]
  );

  // --- Render ---
  return (
    <AppContext.Provider
      value={{ languageSelected, setLanguageSelected, lang }}
    >
      <Sidebar
        userDetail={userDetail}
        userTaskStats={userTaskStats}
        taskList={taskList}
        role={role}
        setTaskList={setTaskList}
        userHistory={userHistory}
        updateTaskAndIndex={updateTaskAndIndex}
        transcript={transcript}
      >
        <div className="w-full flex flex-col justify-center items-center">
          {isLoading ? (
            <h1 className="font-bold text-md md:text-3xl">loading...</h1>
          ) : taskList?.length ? (
            <>
              {(role === "REVIEWER" || role === "FINAL_REVIEWER") && (
                <div>
                  <p className="mt-4 md:mt-10 text-black">
                    <strong>{lang.transcriber} : </strong>
                    <span>
                      {taskList[0]?.transcriber
                        ? taskList[0].transcriber?.name
                        : taskList[0]["transcriber.name"]}
                    </span>
                  </p>
                  {role === "FINAL_REVIEWER" && (
                    <p className="mt-2 text-black">
                      <strong>{lang.reviewer} : </strong>
                      <span>
                        {taskList[0]?.reviewer
                          ? taskList[0]?.reviewer?.name
                          : taskList[0]["reviewer.name"]}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <div className="w-[90%] my-5 md:my-10">
                <div className="flex flex-col gap-10 border rounded-md shadow-sm shadow-gray-400 items-center p-4">
                  <DisplayImage task={taskList[0]} />
                  <TipTap
                    transcript={transcript}
                    editor={editor}
                    format={taskList[0]?.format}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center mt-10 p-5">
              <h1 className="font-bold text-lg md:text-3xl">
                No task found, will allocate soon
              </h1>
            </div>
          )}
        </div>
      </Sidebar>

      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
            background: "white",
            border: "1px solid #ddd",
            padding: 8,
            borderRadius: 4,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          className="tibetan-tooltip"
          ref={tooltipRef}
        >
          <div>
            <strong>Expansion:</strong> {tooltip.expansion}
          </div>
          <button
            className="mt-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleAcceptAbbreviation}
          >
            Accept
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
};

export default TaskView;
