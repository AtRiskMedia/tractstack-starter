/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import { cleanStringUpper } from "../../../utils/common/helpers";
import type { TractStackDatum, TursoQuery } from "../../../types";

interface TractStackEditorProps {
  tractstack: TractStackDatum;
  create: boolean;
}

function createTractStackInsertQuery(tractstack: TractStackDatum): TursoQuery {
  return {
    sql: `INSERT INTO tractstack (
            id,
            title,
            slug,
            social_image_path
          ) VALUES (?, ?, ?, ?)`,
    args: [tractstack.id, tractstack.title, tractstack.slug, tractstack.socialImagePath || null],
  };
}

function createTractStackUpdateQuery(id: string, tractstack: TractStackDatum): TursoQuery {
  return {
    sql: `UPDATE tractstack 
          SET title = ?, 
              slug = ?,
              social_image_path = ?
          WHERE id = ?`,
    args: [tractstack.title, tractstack.slug, tractstack.socialImagePath || null, id],
  };
}

function compareTractStackFields(current: TractStackDatum, original: TractStackDatum): boolean {
  return (
    current.title !== original.title ||
    current.slug !== original.slug ||
    current.socialImagePath !== original.socialImagePath
  );
}

export default function TractStackEditor({ tractstack, create }: TractStackEditorProps) {
  const [localTractStack, setLocalTractStack] = useState<TractStackDatum>(tractstack);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback((field: keyof TractStackDatum, value: any) => {
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
        <label className="block text-sm font-bold text-mydarkgrey">Title</label>
        <input
          type="text"
          value={localTractStack.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-mydarkgrey">Slug</label>
        <input
          type="text"
          value={localTractStack.slug}
          onChange={(e) => handleChange("slug", cleanStringUpper(e.target.value))}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-mydarkgrey">Social Image Path</label>
        <input
          type="text"
          value={localTractStack.socialImagePath || ""}
          onChange={(e) => handleChange("socialImagePath", e.target.value)}
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
            className="px-4 py-2 bg-myblue text-white rounded hover:bg-myblue/80"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
