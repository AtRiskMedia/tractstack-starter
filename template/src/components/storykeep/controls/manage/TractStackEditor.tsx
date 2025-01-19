/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import { cleanString } from "@/utils/common/helpers.ts";
import type { TractStackNode, TursoQuery } from "@/types.ts";

interface TractStackEditorProps {
  tractstack: TractStackNode;
  create: boolean;
}

function createTractStackInsertQuery(tractstack: TractStackNode): TursoQuery {
  return {
    sql: `INSERT INTO tractstacks (
            id,
            title,
            slug,
            social_image_path
          ) VALUES (?, ?, ?, ?)`,
    args: [tractstack.id, tractstack.title, tractstack.slug, tractstack.socialImagePath || null],
  };
}

function createTractStackUpdateQuery(id: string, tractstack: TractStackNode): TursoQuery {
  return {
    sql: `UPDATE tractstacks 
          SET title = ?, 
              slug = ?,
              social_image_path = ?
          WHERE id = ?`,
    args: [tractstack.title, tractstack.slug, tractstack.socialImagePath || null, id],
  };
}

function compareTractStackFields(current: TractStackNode, original: TractStackNode): boolean {
  return (
    current.title !== original.title ||
    current.slug !== original.slug ||
    current.socialImagePath !== original.socialImagePath
  );
}

export default function TractStackEditor({ tractstack, create }: TractStackEditorProps) {
  const [localTractStack, setLocalTractStack] = useState<TractStackNode>(tractstack);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback((field: keyof TractStackNode, value: any) => {
    setLocalTractStack((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;
    try {
      setIsSaving(true);
      const queries: TursoQuery[] = [];
      if (create) {
        queries.push(createTractStackInsertQuery(localTractStack));
      } else if (compareTractStackFields(localTractStack, tractstack)) {
        queries.push(createTractStackUpdateQuery(tractstack.id, localTractStack));
      }

      if (queries.length > 0) {
        const response = await fetch("/api/turso/executeQueries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(queries),
        });

        if (!response.ok) {
          throw new Error("Failed to save tractstack changes");
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to save tractstack changes");
        }
      }

      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (create) {
          navigate(`/storykeep/manage/tractstack/${localTractStack.slug}`);
        }
      }, 7000);
    } catch (error) {
      console.error("Error saving tractstack:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localTractStack, tractstack, unsavedChanges, isSaving, create]);

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
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          {create ? "Create TractStack" : "Edit TractStack"}
        </h3>

        <div className="space-y-6 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800">Title</label>
              <input
                type="text"
                value={localTractStack.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800">Slug</label>
              <input
                type="text"
                value={localTractStack.slug}
                onChange={(e) => handleChange("slug", cleanString(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800">Social Image Path</label>
              <input
                type="text"
                value={localTractStack.socialImagePath || ""}
                onChange={(e) => handleChange("socialImagePath", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
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
