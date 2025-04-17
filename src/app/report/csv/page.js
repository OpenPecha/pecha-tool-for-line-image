"use client";

import React, { useState } from "react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { format } from "date-fns";
import { getTasksForCsvReport } from "@/model/abbreviation";
import Papa from "papaparse";

const CsvReport = () => {
  const [selectedState, setSelectedState] = useState("");
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Task states based on the application's state transitions
  const taskStates = [
    { value: "transcribing", label: "Transcribing" },
    { value: "submitted", label: "Submitted" },
    { value: "accepted", label: "Accepted" },
    { value: "finalised", label: "Finalised" },
    { value: "trashed", label: "Trashed" },
  ];

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  // Function to prepare CSV data from tasks
  const prepareCSVData = (tasks) => {
    return tasks.map((task) => {
      // Base fields that are always included
      const baseFields = {
        ID: task.id,
        "Batch ID": task.batch_id,
        Group: task.group?.name || "",
        State: task.state,
        URL: task.url,
        Transcriber: task.transcriber?.name || "",
        "Transcriber Email": task.transcriber?.email || "",
        Reviewer: task.reviewer?.name || "",
        "Reviewer Email": task.reviewer?.email || "",
        "Final Reviewer": task.final_reviewer?.name || "",
        "Final Reviewer Email": task.final_reviewer?.email || "",
        "Created At": task.created_at
          ? format(new Date(task.created_at), "yyyy-MM-dd HH:mm:ss")
          : "",
        "Submitted At": task.submitted_at
          ? format(new Date(task.submitted_at), "yyyy-MM-dd HH:mm:ss")
          : "",
        "Reviewed At": task.reviewed_at
          ? format(new Date(task.reviewed_at), "yyyy-MM-dd HH:mm:ss")
          : "",
        "Final Reviewed At": task.final_reviewed_at
          ? format(new Date(task.final_reviewed_at), "yyyy-MM-dd HH:mm:ss")
          : "",
        "Reviewer Rejected Count": task.reviewer_rejected_count || 0,
        "Final Reviewer Rejected Count":
          task.final_reviewer_rejected_count || 0,
      };

      // Add transcript fields based on selected state
      const transcriptFields = {};

      // Always include inference transcript
      transcriptFields["Inference Transcript"] = task.inference_transcript || "";

      // Include transcript fields based on state
      if (selectedState === "submitted" || selectedState === "accepted" || selectedState === "finalised") {
        transcriptFields["Transcript"] = task.transcript || "";
      }

      if (selectedState === "accepted" || selectedState === "finalised") {
        transcriptFields["Reviewed Transcript"] = task.reviewed_transcript || "";
      }

      if (selectedState === "finalised") {
        transcriptFields["Final Reviewed Transcript"] = task.final_reviewed_transcript || "";
      }

      // Return combined fields
      return {
        ...baseFields,
        ...transcriptFields,
      };
    });
  };

  // Function to download CSV
  const downloadCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Format dates for API request
      const formattedFrom = dateRange.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : "";
      const formattedTo = dateRange.to
        ? format(dateRange.to, "yyyy-MM-dd")
        : "";

      // Get tasks from server
      const tasks = await getTasksForCsvReport(
        selectedState,
        formattedFrom,
        formattedTo
      );

      // Prepare CSV data
      const csvData = prepareCSVData(tasks);

      // Generate filename with date and state
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `task_report_${selectedState}_${timestamp}.csv`;

      // Download CSV
      downloadCSV(csvData, filename);
    } catch (err) {
      console.error("Error generating CSV report:", err);
      setError("Failed to generate CSV report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">CSV Report</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-control w-full max-w-md">
          <label htmlFor="taskState" className="label">
            <span className="label-text">Task State</span>
          </label>
          <select
            id="taskState"
            className="select select-bordered w-full"
            value={selectedState}
            onChange={handleStateChange}
            required
          >
            <option value="" disabled>
              Select a task state
            </option>
            {taskStates.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control w-full max-w-md">
          <label htmlFor="dateRange" className="label">
            <span className="label-text">Date Range</span>
          </label>
          <div className="mt-1" id="dateRange">
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              aria-labelledby="dateRange"
            />
          </div>
        </div>

        <div className="form-control w-full max-w-md mt-6">
          <button
            type="submit"
            className={`btn btn-primary ${isLoading ? "loading" : ""}`}
            disabled={
              !selectedState || !dateRange.from || !dateRange.to || isLoading
            }
          >
            {isLoading ? "Generating..." : "Generate CSV"}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <div className="flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="w-6 h-6 mx-2 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                ></path>
              </svg>
              <label>{error}</label>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CsvReport;
