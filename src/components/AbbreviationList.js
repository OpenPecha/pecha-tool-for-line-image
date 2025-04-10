"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import { getAbbreviations } from "@/model/abbreviation";

const AbbreviationList = ({ isOpen, onClose }) => {
  const [abbreviations, setAbbreviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAbbreviations = async () => {
      try {
        const response = await getAbbreviations();
        setAbbreviations(response);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching abbreviations:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchAbbreviations();
  }, []);

  if (!isOpen) return null;

  // Determine content based on loading/error state
  let content;
  if (loading) {
    content = (
      <div className="flex justify-center items-center h-full">
        <p>Loading abbreviations...</p>
      </div>
    );
  } else if (error) {
    content = <div className="text-red-500 p-4">{error}</div>;
  } else if (!abbreviations.length) {
    content = (
      <div className="flex justify-center items-center h-full">
        <p>No abbreviations found</p>
      </div>
    );
  } else {
    content = (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 top-0">
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
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-1/3 bg-white shadow-lg z-50 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Abbreviation Dictionary</h2>
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

      <div className="flex-1 overflow-y-auto p-4">{content}</div>
    </div>
  );
};

AbbreviationList.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AbbreviationList;
