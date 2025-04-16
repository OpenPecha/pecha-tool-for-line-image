"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import { getAbbreviations, updateAbbreviation } from "@/model/abbreviation";
import toast from "react-hot-toast";
import AddAbbreviationDialog from "./AddAbbreviationDialog";

// Custom hook for managing abbreviations data and pagination
const useAbbreviations = (isOpen) => {
  const [abbreviations, setAbbreviations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 10;

  // Function to load more abbreviations
  const loadAbbreviations = useCallback(
    async (pageToLoad) => {
      if ((!hasMore && pageToLoad > 0) || !isOpen) return;

      try {
        setLoading(true);
        setError(null);
        const result = await getAbbreviations(pageToLoad, pageSize);
        if (pageToLoad === 0) {
          setAbbreviations(result.abbreviations);
        } else {
          setAbbreviations((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const newAbbrs = result.abbreviations.filter(
              (a) => !existingIds.has(a.id)
            );
            const merged = [...prev, ...newAbbrs];
            return merged;
          });
        }

        setHasMore(result.pagination.hasMore);
        setTotalCount(result.pagination.totalCount);
        setPage(pageToLoad);
      } catch (error) {
        console.error("Error fetching abbreviations:", error);
        setError("Failed to load abbreviations. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [hasMore, pageSize, isOpen]
  );

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadAbbreviations(0);
    }
  }, [isOpen, loadAbbreviations]);

  // Function to update a single abbreviation in the list
  const updateAbbreviationInList = useCallback((id, updatedData) => {
    setAbbreviations((prevAbbrs) =>
      prevAbbrs.map((abbr) =>
        abbr.id === id ? { ...abbr, ...updatedData } : abbr
      )
    );
  }, []);

  return {
    abbreviations,
    loading,
    error,
    page,
    hasMore,
    totalCount,
    loadAbbreviations,
    updateAbbreviationInList,
  };
};

// Custom hook for editing abbreviations
const useAbbreviationEditor = (updateAbbreviationInList) => {
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    convention: "",
    expansion: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Start editing an abbreviation
  const startEditing = useCallback((abbr) => {
    setEditingId(abbr.id);
    setEditValues({
      convention: abbr.convention,
      expansion: abbr.expansion,
    });
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  // Handle input change for editing
  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Save edited abbreviation
  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    try {
      setIsSubmitting(true);
      const updatedAbbr = await updateAbbreviation(
        editingId,
        editValues.convention,
        editValues.expansion
      );

      if (updatedAbbr) {
        updateAbbreviationInList(editingId, editValues);
        toast.success("Abbreviation updated successfully");
      } else {
        toast.error("Failed to update abbreviation");
      }
    } catch (error) {
      console.error("Error updating abbreviation:", error);
      toast.error("Error updating abbreviation");
    } finally {
      setEditingId(null);
      setIsSubmitting(false);
    }
  }, [editingId, editValues, updateAbbreviationInList]);

  return {
    editingId,
    editValues,
    isSubmitting,
    startEditing,
    cancelEditing,
    handleEditChange,
    saveEdit,
  };
};

// Header component with close button and add button
const Header = ({
  totalCount,
  abbreviationsCount,
  isReviewer,
  onAddClick,
  onClose,
}) => (
  <div className="flex justify-between items-center p-4 border-b">
    <h2 className="text-xl font-semibold">
      Abbreviation Dictionary{" "}
      {totalCount > 0 && `(${abbreviationsCount}/${totalCount})`}
    </h2>
    <div className="flex items-center">
      {isReviewer && (
        <button
          onClick={onAddClick}
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
);

// Table header component
const TableHeader = ({ isReviewer }) => (
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
);

// Abbreviation row component
const AbbreviationRow = ({
  abbr,
  isReviewer,
  editingId,
  editValues,
  onEdit,
  onSave,
  onCancel,
  onEditChange,
  isSubmitting,
}) => (
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
          onChange={onEditChange}
          className="w-full p-1 border border-gray-300 rounded"
          disabled={isSubmitting}
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
          onChange={onEditChange}
          className="w-full p-1 border border-gray-300 rounded"
          disabled={isSubmitting}
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
              onClick={onSave}
              className="text-green-600 hover:text-green-900 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onCancel}
              className="text-red-600 hover:text-red-900 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onEdit(abbr)}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Edit
          </button>
        )}
      </td>
    )}
  </tr>
);

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="flex justify-center items-center h-full">
    <p>No abbreviations found</p>
  </div>
);

// Error state component
const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col justify-center items-center h-full">
    <p className="text-red-500 mb-4">{message}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Retry
    </button>
  </div>
);

// Main AbbreviationList component
const AbbreviationList = ({ isOpen, onClose, userRole = "" }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const tableContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const isReviewer = userRole === "REVIEWER";

  // Use custom hooks
  const {
    abbreviations,
    loading,
    error,
    page,
    hasMore,
    totalCount,
    loadAbbreviations,
    updateAbbreviationInList,
  } = useAbbreviations(isOpen);

  const {
    editingId,
    editValues,
    isSubmitting,
    startEditing,
    cancelEditing,
    handleEditChange,
    saveEdit,
  } = useAbbreviationEditor(updateAbbreviationInList);

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

  // Reset new abbreviation form
  const handleAddSuccess = async () => {
    setShowAddDialog(false);
    // Reload the first page to include the new abbreviation
    await loadAbbreviations(0);
  };

  if (!isOpen) return null;

  // Extracted conditional rendering logic
  let content;
  // Defensive deduplication before rendering
  const uniqueAbbreviations = Array.from(
    new Map(abbreviations.map((a) => [a.id, a])).values()
  );
  if (error) {
    content = (
      <ErrorState message={error} onRetry={() => loadAbbreviations(0)} />
    );
  } else if (uniqueAbbreviations.length === 0 && !loading) {
    content = <EmptyState />;
  } else {
    content = (
      <>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader isReviewer={isReviewer} />
          <tbody className="bg-white divide-y divide-gray-200">
            {uniqueAbbreviations.map((abbr) => (
              <AbbreviationRow
                key={abbr.id}
                abbr={abbr}
                isReviewer={isReviewer}
                editingId={editingId}
                editValues={editValues}
                onEdit={startEditing}
                onSave={saveEdit}
                onCancel={cancelEditing}
                onEditChange={handleEditChange}
                isSubmitting={isSubmitting}
              />
            ))}
          </tbody>
        </table>
        {loading && <LoadingSpinner />}
      </>
    );
  }

  return (
    <div
      className="fixed top-0 right-0 h-full w-1/3 bg-white shadow-lg z-50 overflow-hidden flex flex-col"
      ref={sidebarRef}
    >
      <Header
        totalCount={totalCount}
        abbreviationsCount={abbreviations.length}
        isReviewer={isReviewer}
        onAddClick={() => setShowAddDialog(true)}
        onClose={onClose}
      />

      <div ref={tableContainerRef} className="flex-1 overflow-y-auto p-4">
        {content}
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
