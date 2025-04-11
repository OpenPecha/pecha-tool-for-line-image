"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import { getAbbreviations, updateAbbreviation } from "@/model/abbreviation";
import toast from "react-hot-toast";
import AddAbbreviationDialog from "./AddAbbreviationDialog";

const AbbreviationList = ({ isOpen, onClose, userRole = "" }) => {
  const [abbreviations, setAbbreviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    convention: "",
    expansion: "",
  });
  const [showAddDialog, setShowAddDialog] = useState(false);

  const pageSize = 10;
  const tableContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const isReviewer = userRole === "REVIEWER";

  // Function to load more abbreviations
  const loadAbbreviations = useCallback(
    async (pageToLoad) => {
      if (!hasMore && pageToLoad > 0) return;

      try {
        setLoading(true);
        const result = await getAbbreviations(pageToLoad, pageSize);

        if (pageToLoad === 0) {
          setAbbreviations(result.abbreviations);
        } else {
          setAbbreviations((prev) => [...prev, ...result.abbreviations]);
        }

        setHasMore(result.pagination.hasMore);
        setTotalCount(result.pagination.totalCount);
        setPage(pageToLoad);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching abbreviations:", error);
        setLoading(false);
      }
    },
    [hasMore, pageSize]
  );

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadAbbreviations(0);
    }
  }, [isOpen, loadAbbreviations]);

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle scroll events for infinite scrolling
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

    // Load more when user scrolls to bottom (with a threshold of 100px)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadAbbreviations(page + 1);
    }
  }, [loading, hasMore, page, loadAbbreviations]);

  // Setup scroll event listener
  useEffect(() => {
    const currentRef = tableContainerRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Start editing an abbreviation
  const handleEdit = (abbr) => {
    setEditingId(abbr.id);
    setEditValues({
      convention: abbr.convention,
      expansion: abbr.expansion,
    });
  };

  // Save edited abbreviation
  const handleSave = async () => {
    try {
      setLoading(true);

      const updatedAbbr = await updateAbbreviation(
        editingId,
        editValues.convention,
        editValues.expansion
      );

      if (updatedAbbr) {
        // Update the abbreviation in the local state
        setAbbreviations((prevAbbrs) =>
          prevAbbrs.map((abbr) =>
            abbr.id === editingId ? { ...abbr, ...editValues } : abbr
          )
        );
        toast.success("Abbreviation updated successfully");
      } else {
        toast.error("Failed to update abbreviation");
      }
    } catch (error) {
      console.error("Error updating abbreviation:", error);
      toast.error("Error updating abbreviation");
    } finally {
      setEditingId(null);
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Handle input change for editing
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset new abbreviation form
  const handleAddSuccess = async () => {
    setShowAddDialog(false);
    // Reload the first page to include the new abbreviation
    await loadAbbreviations(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-0 right-0 h-full w-1/3 bg-white shadow-lg z-50 overflow-hidden flex flex-col"
      ref={sidebarRef}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">
          Abbreviation Dictionary{" "}
          {totalCount > 0 && `(${abbreviations.length}/${totalCount})`}
        </h2>
        <div className="flex items-center">
          {isReviewer && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="mr-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
              aria-label="Add new abbreviation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close sidebar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div ref={tableContainerRef} className="flex-1 overflow-y-auto p-4">
        {abbreviations.length === 0 && !loading ? (
          <div className="flex justify-center items-center h-full">
            <p>No abbreviations found</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider"
                  >
                    Image
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider"
                  >
                    Convention
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider"
                  >
                    Expansion
                  </th>
                  {isReviewer && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-sm font-medium text-black uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {abbreviations.map((abbr) => (
                  <tr key={abbr.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {abbr.image ? (
                        <div className="h-12 w-12 relative">
                          <Image
                            src={abbr.image}
                            alt={abbr.convention}
                            fill
                            sizes="48px"
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === abbr.id ? (
                        <input
                          id="convention-edit-input"
                          type="text"
                          name="convention"
                          value={editValues.convention}
                          onChange={handleEditChange}
                          className="w-full p-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <div className="text-lg font-semibold text-gray-900">
                          {abbr.convention}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === abbr.id ? (
                        <input
                          id="expansion-edit-input"
                          type="text"
                          name="expansion"
                          value={editValues.expansion}
                          onChange={handleEditChange}
                          className="w-full p-1 border border-gray-300 rounded"
                        />
                      ) : (
                        <div className="text-lg font-semibold text-black-900">
                          {abbr.expansion}
                        </div>
                      )}
                    </td>
                    {isReviewer && (
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        {editingId === abbr.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSave}
                              className="text-green-600 hover:text-green-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(abbr)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add New Abbreviation Dialog */}
      <AddAbbreviationDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};

AbbreviationList.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userRole: PropTypes.string,
};

export default AbbreviationList;
