import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import type { ImageFileNode } from "@/types.ts";

interface ImageEditorProps {
  image: ImageFileNode;
}

export default function ImageEditor({ image }: ImageEditorProps) {
  const [localImage, setLocalImage] = useState<ImageFileNode>(image);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback((value: string) => {
    setLocalImage((prev) => ({ ...prev, altDescription: value }));
    setUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;

    try {
      setIsSaving(true);

      const response = await fetch("/api/turso/upsertFileNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localImage),
      });

      if (!response.ok) {
        throw new Error("Failed to save image changes");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save image changes");
      }

      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 7000);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localImage, unsavedChanges, isSaving]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        navigate(`/storykeep`);
      }
    } else {
      navigate(`/storykeep`);
    }
  }, [unsavedChanges]);

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Edit Image</h3>

        <div className="space-y-6 max-w-screen-xl mx-auto">
          <div className="border-cyan-700 border-4 rounded-lg overflow-hidden">
            <img
              src={localImage.src}
              alt={localImage.altDescription}
              className="max-w-full h-auto"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800">Filename</label>
              <input
                type="text"
                value={localImage.filename}
                disabled
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800">Alt Description</label>
              <input
                type="text"
                value={localImage.altDescription}
                onChange={(e) => handleChange(e.target.value)}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {unsavedChanges ? "Cancel" : "Close"}
            </button>
            {unsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>

          {(unsavedChanges || saveSuccess) && (
            <div
              className={`mt-4 p-4 rounded-md ${unsavedChanges ? "bg-amber-50" : "bg-green-50"}`}
            >
              {unsavedChanges ? (
                <p className="text-gray-800 font-bold">
                  <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2 text-amber-500" />
                  You have unsaved changes
                </p>
              ) : (
                <p className="text-gray-800 font-bold">
                  <CheckCircleIcon className="inline-block h-5 w-5 mr-2 text-green-500" />
                  Changes saved successfully
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
