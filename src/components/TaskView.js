"use client";

import { getTasksOrAssignMore, updateTask } from "@/model/action";
import React, { useState, useRef, useEffect } from "react";
import ActionButtons from "./ActionButtons";
import { UserProgressStats } from "@/model/task";
import Sidebar from "@/components/Sidebar";
import toast from "react-hot-toast";
import AppContext from "./AppContext";
import DisplayImage from "@/components/DisplayImage";

const TaskView = ({ tasks, userDetail, language, userHistory }) => {
  const [languageSelected, setLanguageSelected] = useState("bo");
  const lang = language[languageSelected];
  const [taskList, setTaskList] = useState(tasks);
  const [transcript, setTranscript] = useState("");
  const [userTaskStats, setUserTaskStats] = useState({
    completedTaskCount: 0,
    totalTaskCount: 0,
    totalTaskPassed: 0,
  }); // {completedTaskCount, totalTaskCount, totalTaskPassed}
  const [isLoading, setIsLoading] = useState(true);
  const { id: userId, group_id: groupId, role } = userDetail;
  const currentTimeRef = useRef(null);

  function getLastTaskIndex() {
    return taskList.length != 0 ? taskList?.length - 1 : 0;
  }

  useEffect(() => {
    getUserProgress();
    // Assign a value to currentTimeRef.current
    currentTimeRef.current = new Date().toISOString();
    if (taskList?.length) {
      setIsLoading(false);
      switch (role) {
        case "TRANSCRIBER":
          taskList[0]?.transcript != null && taskList[0]?.transcript != ""
            ? setTranscript(taskList[0]?.transcript)
            : setTranscript(taskList[0]?.inference_transcript);
          break;
        case "REVIEWER":
          taskList[0].reviewed_transcript != null &&
          taskList[0].reviewed_transcript != ""
            ? setTranscript(taskList[0]?.reviewed_transcript)
            : setTranscript(taskList[0]?.transcript);
          break;
        case "FINAL_REVIEWER":
          taskList[0].final_reviewed_transcript != null &&
          taskList[0].final_reviewed_transcript != ""
            ? setTranscript(taskList[0]?.final_reviewed_transcript)
            : setTranscript(taskList[0]?.reviewed_transcript);
        default:
          break;
      }
    } else {
      setIsLoading(false);
    }
  }, [taskList]);

  const getUserProgress = async () => {
    const { completedTaskCount, totalTaskCount, totalTaskPassed } =
      await UserProgressStats(userId, role, groupId);
    setUserTaskStats({
      completedTaskCount,
      totalTaskCount,
      totalTaskPassed,
    });
  };

  const updateTaskAndIndex = async (action, transcript, task) => {
    try {
      const { id } = task;
      // update the task in the database
      const { msg, updatedTask } = await updateTask(
        action,
        id,
        transcript,
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
      if (getLastTaskIndex() != 0) {
        // remove the task updated from the task list
        setTaskList((prev) => prev.filter((task) => task.id !== id));
        if (action === "submit") {
          currentTimeRef.current = new Date().toISOString();
        }
      } else {
        // when it is the last task in the task list
        const moreTask = await getTasksOrAssignMore(groupId, userId, role);
        setIsLoading(true);
        setTaskList(moreTask);
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  const petsukBatches = [
    "batch19",
    "batch20",
    "batch21",
    "batch22",
    "batch23",
    "batch24",
    "batch25",
  ];

  const drutsaBatches = [
    "batch26",
    "batch27",
    "batch28",
    "batch29",
    "batch30",
    "batch31",
    "batch32",
    "batch-test",
    "batch33",
    "batch34",
    "batch35",
    "batch36",
    "batch37a",
    "batch37b",
  ];

  const batchId = taskList[0]?.batch_id;

  const isPetsuk = petsukBatches.includes(batchId);
  const isDrutsa = drutsaBatches.includes(batchId);

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
      >
        {/* Page content here */}
        <div className="w-full flex flex-col justify-center items-center">
          {isLoading ? (
            <h1 className="font-bold text-md md:text-3xl">loading...</h1>
          ) : taskList?.length ? (
            <>
              {(role === "REVIEWER" || role === "FINAL_REVIEWER") && (
                <div>
                  <p className="mt-4 md:mt-10">
                    <strong>{lang.transcriber} : </strong>
                    <span>{taskList[0]?.transcriber?.name}</span>
                  </p>
                  {role === "FINAL_REVIEWER" && (
                    <p className="mt-2">
                      <strong>{lang.reviewer} : </strong>
                      <span>{taskList[0]?.reviewer?.name}</span>
                    </p>
                  )}
                </div>
              )}
              <div className="w-[95%] mt-5 md:mt-10">
                <div className="flex flex-col gap-10 border rounded-md shadow-sm shadow-gray-400 items-center p-4">
                  <DisplayImage url={taskList[0]?.url} />
                  <input
                    value={transcript || ""}
                    onChange={(e) => setTranscript(e.target.value)}
                    className={`${
                      isPetsuk
                        ? "font-Petsuk"
                        : isDrutsa
                        ? "font-Drutsa"
                        : "font-Ouchan"
                    } rounded-md p-4 border border-slate-400 w-full h-full text-2xl`}
                    placeholder="Type here..."
                    id="transcript"
                  />
                </div>
              </div>
              <ActionButtons
                updateTaskAndIndex={updateTaskAndIndex}
                tasks={taskList}
                transcript={transcript}
                role={role}
              />
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
    </AppContext.Provider>
  );
};

export default TaskView;
