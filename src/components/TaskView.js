"use client";

import { getTasksOrAssignMore, updateTask } from "@/model/action";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserProgressStats } from "@/model/task";
import Sidebar from "@/components/Sidebar";
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
import AbbreviationList from "@/components/AbbreviationList";

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
  const [isAbbreviationSidebarOpen, setIsAbbreviationSidebarOpen] = useState(false);
  const currentTimeRef = useRef(null);
  const { id: userId, group_id: groupId, role } = userDetail;

  // --- User Progress ---
  const [userTaskStats, getUserProgress] = useUserProgressStats(userId, role, groupId);

  // --- Helpers ---
  const getLastTaskIndex = useCallback(() => (taskList.length !== 0 ? taskList.length - 1 : 0), [taskList]);

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
        setTranscript(task.final_reviewed_transcript || task.reviewed_transcript || "");
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

  // --- Editor ---
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, TextStyle, Color, HardBreak, History],
    onUpdate: ({ editor }) => setTranscript(editor.getHTML()),
    editable: true,
    editorProps: { attributes: { class: "p-2 focus-within:outline-none" } },
  });

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
    <AppContext.Provider value={{ languageSelected, setLanguageSelected, lang }}>
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
              <div className="w-full flex justify-end px-4 mt-2">
                <button
                  onClick={() => setIsAbbreviationSidebarOpen((v) => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Toggle abbreviation sidebar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
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
                  <TipTap transcript={transcript} editor={editor} format={taskList[0]?.format} />
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
      <AbbreviationList
        isOpen={isAbbreviationSidebarOpen}
        onClose={() => setIsAbbreviationSidebarOpen(false)}
        userRole={role}
      />
    </AppContext.Provider>
  );
};

export default TaskView;
