"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import {
  getAbbreviations,
  updateAbbreviation,
  searchAbbreviations,
  deleteAbbreviation,
} from "@/model/abbreviation";
import toast from "react-hot-toast";
import AddAbbreviationDialog from "./AddAbbreviationDialog";

// Custom hook for managing abbreviations data and pagination
const useAbbreviations = (isOpen) => {
  const [abbreviations, setAbbreviations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

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
  const updateAbbreviationInList = useCallback(
    (id, updatedData) => {
      // Update in regular list
      setAbbreviations((prevAbbrs) =>
        prevAbbrs.map((abbr) =>
          abbr.id === id ? { ...abbr, ...updatedData } : abbr
        )
      );

      // Also update in search results if present
      if (isSearchMode) {
        setSearchResults((prevResults) =>
          prevResults.map((abbr) =>
            abbr.id === id ? { ...abbr, ...updatedData } : abbr
          )
        );
      }
    },
    [isSearchMode]
  );

  // Handle search term change
  const handleSearchChange = useCallback(async (term) => {
    setSearchTerm(term);

    if (!term.trim()) {
      // If search is cleared, exit search mode and show regular data
      setIsSearchMode(false);
      return;
    }

    try {
      setSearching(true);
      setIsSearchMode(true);
      setError(null);

      // Call server-side search function
      const results = await searchAbbreviations(term);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching abbreviations:", error);
      setError("Failed to search abbreviations. Please try again.");
    } finally {
      setSearching(false);
    }
  }, []);

  // Get the appropriate abbreviations to display
  const displayedAbbreviations = useMemo(() => {
    return isSearchMode ? searchResults : abbreviations;
  }, [isSearchMode, searchResults, abbreviations]);

  return {
    abbreviations: displayedAbbreviations,
    allAbbreviations: abbreviations,
    loading: loading || searching,
    error,
    page,
    hasMore: isSearchMode ? false : hasMore, // No infinite scroll in search mode
    totalCount,
    searchTerm,
    isSearchMode,
    loadAbbreviations,
    updateAbbreviationInList,
    handleSearchChange,
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
  isSidebar,
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
      {isSidebar && (
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
      )}
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
  onDelete,
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
          className="w-full p-1 border border-gray-300 rounded bg-white"
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
          className="w-full p-1 border border-gray-300 rounded bg-white"
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
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(abbr)}
              className="text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(abbr.id)}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          </div>
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

// Search bar component
const SearchBar = ({ searchTerm, onSearchChange }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const searchTimeoutRef = useRef(null);

  // Update local state when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);

    // Debounce search to avoid too many requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  };

  const handleClear = () => {
    setLocalSearchTerm("");
    onSearchChange("");
  };

  return (
    <div className="relative mb-4">
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
        <div className="pl-3 pr-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search abbreviations..."
          value={localSearchTerm}
          onChange={handleChange}
          className="w-full py-2 px-2 outline-none bg-white"
        />
        {localSearchTerm && (
          <button
            onClick={handleClear}
            className="px-3 text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
        )}
      </div>
    </div>
  );
};

SearchBar.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

// Main AbbreviationList component
const AbbreviationList = ({ isOpen, onClose, userRole = "", isSidebar }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const tableContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const isReviewer = userRole === "REVIEWER" || userRole === "FINAL_REVIEWER";

  // Use custom hooks
  const {
    abbreviations,
    allAbbreviations,
    loading,
    error,
    page,
    hasMore,
    totalCount,
    searchTerm,
    isSearchMode,
    loadAbbreviations,
    updateAbbreviationInList,
    handleSearchChange,
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

  const handleDeleteAbbreviation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this abbreviation?"))
      return;
    try {
      const result = await deleteAbbreviation(id);
      if (result) {
        toast.success("Abbreviation deleted successfully");
        await loadAbbreviations(0); // reload list
      } else {
        toast.error("Failed to delete abbreviation");
      }
    } catch (error) {
      toast.error("Error deleting abbreviation");
    }
  };

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
    if (!tableContainerRef.current || loading || !hasMore || isSearchMode)
      return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;

    // Load more when user scrolls to bottom (with a threshold of 100px)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadAbbreviations(page + 1);
    }
  }, [loading, hasMore, page, loadAbbreviations, isSearchMode]);

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
    content = searchTerm ? (
      <div className="flex justify-center items-center h-full">
        <p>No abbreviations found matching &quot;{searchTerm}&quot;</p>
      </div>
    ) : (
      <EmptyState />
    );
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
                onDelete={handleDeleteAbbreviation}
              />
            ))}
          </tbody>
        </table>
        {loading && <LoadingSpinner />}
        {isSearchMode && !loading && (
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing search results.{" "}
            <button
              onClick={() => handleSearchChange("")}
              className="text-blue-500 hover:underline"
            >
              Clear search
            </button>{" "}
            to view all abbreviations.
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={
        isSidebar
          ? "fixed inset-0 z-50 w-full h-full bg-white text-black rounded-lg shadow-lg flex flex-col border-2 border-[#384451]"
          : "flex flex-col justify-center items-center w-full h-full bg-white"
      }
      style={{ minHeight: "100vh" }}
    >
      <div
        className={
          isSidebar
            ? "fixed top-0 left-0 w-full h-full bg-white shadow-lg z-50 overflow-hidden flex flex-col"
            : "fixed top-0 w-1/2 h-full bg-white shadow-lg z-50 overflow-hidden flex flex-col"
        }
        ref={sidebarRef}
      >
        <Header
          totalCount={totalCount}
          abbreviationsCount={allAbbreviations.length}
          isReviewer={isReviewer}
          onAddClick={() => setShowAddDialog(true)}
          onClose={onClose}
          isSidebar={isSidebar}
        />

        <div
          ref={tableContainerRef}
          className="flex-1 h-full overflow-y-auto p-4"
        >
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />
          {content}
        </div>

        {/* Add New Abbreviation Dialog */}
        <AddAbbreviationDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={handleAddSuccess}
        />
      </div>
    </div>
  );
};

AbbreviationList.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userRole: PropTypes.string,
  isSidebar: PropTypes.bool.isRequired,
};

export default AbbreviationList;
