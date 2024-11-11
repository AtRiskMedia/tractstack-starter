import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import { tursoClient } from "../../../api/tursoClient";
import type { FileDatum, TursoQuery } from "../../../types";

interface ImageEditorProps {
  image: FileDatum;
}

function createFileUpdateQuery(id: string, file: FileDatum): TursoQuery {
  return {
    sql: `UPDATE file 
          SET alt_description = ?
          WHERE id = ?`,
    args: [file.altDescription || null, id],
  };
}

function compareFileFields(current: FileDatum, original: FileDatum): boolean {
  return current.altDescription !== original.altDescription;
}

export default function ImageEditor({ image }: ImageEditorProps) {
  const [localImage, setLocalImage] = useState<FileDatum>(image);
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
      if (compareFileFields(localImage, image)) {
        const queries: TursoQuery[] = [createFileUpdateQuery(image.id, localImage)];
        const result = await tursoClient.execute(queries);
        if (!result) {
          throw new Error("Failed to save image changes");
        }
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
  }, [localImage, image, unsavedChanges, isSaving]);

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
    <div className="space-y-6">
      {(unsavedChanges || saveSuccess) && (
        <div
          className={`p-4 rounded-md mb-4 ${unsavedChanges ? "bg-myorange/10" : "bg-mygreen/10"}`}
        >
          {unsavedChanges ? (
            <>
              <p className="text-black font-bold">
                <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2" />
                Unsaved Changes
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-mydarkgrey text-white rounded hover:bg-mydarkgrey/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-myorange text-black rounded hover:bg-black hover:text-white"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <p className="text-black font-bold">
              <CheckCircleIcon className="inline-block h-5 w-5 mr-2" />
              Save successful
            </p>
          )}
        </div>
      )}

      <div>
        <img
          src={localImage.src}
          alt={localImage.altDescription}
          className="max-w-full h-auto mb-4"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-mydarkgrey">Filename</label>
        <input
          type="text"
          value={localImage.filename}
          disabled
          className="mt-1 block w-full rounded-md border-mydarkgrey bg-mylightgrey/20 shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-mydarkgrey">Alt Description</label>
        <input
          type="text"
          value={localImage.altDescription}
          onChange={(e) => handleChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-mydarkgrey text-white rounded hover:bg-mydarkgrey/80"
        >
          {unsavedChanges ? "Cancel" : "Close"}
        </button>
        {unsavedChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-myorange text-black rounded hover:bg-black hover:text-white"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
