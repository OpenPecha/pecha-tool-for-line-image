"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import { getAbbreviations } from "@/model/abbreviation";

const AbbreviationList = ({ isOpen, onClose }) => {
  const [abbreviations, setAbbreviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const observer = useRef();
  const tableContainerRef = useRef(null);

  // Function to load more abbreviations
  const loadAbbreviations = useCallback(async (pageToLoad) => {
    if (!hasMore && pageToLoad > 0) return;
    
    try {
      setLoading(true);
      const response = await getAbbreviations(pageToLoad, pageSize);
      
      if (pageToLoad === 0) {
        setAbbreviations(response.abbreviations);
      } else {
        setAbbreviations(prev => [...prev, ...response.abbreviations]);
      }
      
      setHasMore(response.pagination.hasMore);
      setTotalCount(response.pagination.totalCount);
      setPage(pageToLoad);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching abbreviations:", error);
      setError(error.message);
      setLoading(false);
    }
  }, [hasMore]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadAbbreviations(0);
    }
  }, [isOpen, loadAbbreviations]);

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
      currentRef.addEventListener('scroll', handleScroll);
      return () => currentRef.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-1/3 bg-white shadow-lg z-50 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">
          Abbreviation Dictionary {totalCount > 0 && `(${abbreviations.length}/${totalCount})`}
        </h2>
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

      <div 
        ref={tableContainerRef} 
        className="flex-1 overflow-y-auto p-4"
      >
        {abbreviations.length === 0 && !loading ? (
          <div className="flex justify-center items-center h-full">
            <p>No abbreviations found</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
                      <div className="text-lg font-semibold text-gray-900">
                        {abbr.convention}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-black-900">
                        {abbr.expansion}
                      </div>
                    </td>
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
    </div>
  );
};

AbbreviationList.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AbbreviationList;
