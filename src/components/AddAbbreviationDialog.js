"use client";

import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import Image from "next/image";
import { addAbbreviation } from "@/model/abbreviation";
import toast from "react-hot-toast";

const AddAbbreviationDialog = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [newAbbreviation, setNewAbbreviation] = useState({
    convention: "",
    expansion: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle input change for new abbreviation
  const handleNewAbbrChange = (e) => {
    const { name, value } = e.target;
    setNewAbbreviation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Create a preview URL for the selected image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to S3
  const uploadImageToS3 = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      return data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // Submit new abbreviation
  const handleAddAbbreviation = async () => {
    if (
      !newAbbreviation.convention ||
      !newAbbreviation.expansion ||
      !newAbbreviation.image
    ) {
      toast.error("Convention, expansion and image are required");
      return;
    }

    try {
      setLoading(true);

      let imageUrl = "";
      if (selectedFile) {
        // Upload image to S3 and get the URL
        imageUrl = await uploadImageToS3(selectedFile);
      }

      const result = await addAbbreviation(
        newAbbreviation.convention,
        newAbbreviation.expansion,
        imageUrl
      );

      if (result) {
        toast.success("New abbreviation added successfully");
        resetForm();
        onSuccess();
      } else {
        toast.error("Failed to add new abbreviation");
      }
    } catch (error) {
      console.error("Error adding new abbreviation:", error);
      toast.error("Error adding new abbreviation");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewAbbreviation({
      convention: "",
      expansion: "",
      image: "",
    });
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Add New Abbreviation</h3>

        <div className="mb-4">
          <label
            htmlFor="convention-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Convention
          </label>
          <input
            id="convention-input"
            type="text"
            name="convention"
            value={newAbbreviation.convention}
            onChange={handleNewAbbrChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter convention"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="expansion-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Expansion
          </label>
          <input
            id="expansion-input"
            type="text"
            name="expansion"
            value={newAbbreviation.expansion}
            onChange={handleNewAbbrChange}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter expansion"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="image-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Image
          </label>
          <input
            id="image-input"
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded"
          />
          {imagePreview && (
            <div className="mt-2 relative h-32 w-full">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAddAbbreviation}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

AddAbbreviationDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default AddAbbreviationDialog;
