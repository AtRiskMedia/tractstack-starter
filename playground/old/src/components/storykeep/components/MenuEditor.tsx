import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { tursoClient } from "../../../api/tursoClient";
import { cleanString } from "../../../utils/helpers";
import type { MenuDatum, MenuLink, TursoQuery } from "../../../types";

interface MenuEditorProps {
  menu: MenuDatum;
  create: boolean;
}

function createMenuInsertQuery(menu: MenuDatum): TursoQuery {
  return {
    sql: `INSERT INTO menu (
            id,
            title,
            theme,
            options_payload
          ) VALUES (?, ?, ?, ?)`,
    args: [menu.id, menu.title, menu.theme, JSON.stringify(menu.optionsPayload)],
  };
}

function createMenuUpdateQuery(id: string, menu: MenuDatum): TursoQuery {
  return {
    sql: `UPDATE menu 
          SET title = ?, 
              theme = ?, 
              options_payload = ?
          WHERE id = ?`,
    args: [menu.title, menu.theme, JSON.stringify(menu.optionsPayload), id],
  };
}

function compareMenuFields(current: MenuDatum, original: MenuDatum): boolean {
  return (
    current.title !== original.title ||
    current.theme !== original.theme ||
    JSON.stringify(current.optionsPayload) !== JSON.stringify(original.optionsPayload)
  );
}

export default function MenuEditor({ menu, create }: MenuEditorProps) {
  const [localMenu, setLocalMenu] = useState<MenuDatum>(menu);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleChange = useCallback((field: keyof MenuDatum, value: any) => {
    setLocalMenu((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  }, []);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleLinkChange = useCallback((index: number, field: keyof MenuLink, value: any) => {
    setLocalMenu((prev) => {
      const newLinks = [...prev.optionsPayload];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, optionsPayload: newLinks };
    });
    setUnsavedChanges(true);
  }, []);

  const handleAddLink = useCallback(() => {
    setLocalMenu((prev) => ({
      ...prev,
      optionsPayload: [
        ...prev.optionsPayload,
        {
          name: "",
          description: "",
          featured: false,
          actionLisp: "",
        },
      ],
    }));
    setUnsavedChanges(true);
  }, []);

  const handleRemoveLink = useCallback((index: number) => {
    setLocalMenu((prev) => ({
      ...prev,
      optionsPayload: prev.optionsPayload.filter((_, i) => i !== index),
    }));
    setUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;
    try {
      setIsSaving(true);
      const queries: TursoQuery[] = [];
      if (create) {
        queries.push(createMenuInsertQuery(localMenu));
      } else if (compareMenuFields(localMenu, menu)) {
        queries.push(createMenuUpdateQuery(menu.id, localMenu));
      }
      if (queries.length > 0) {
        const result = await tursoClient.execute(queries);
        if (!result) {
          throw new Error("Failed to save menu changes");
        }
      }
      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (create) {
          navigate(`/storykeep/manage/menu/${localMenu.id}`);
        }
      }, 7000);
    } catch (error) {
      console.error("Error saving menu:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localMenu, menu, unsavedChanges, isSaving, create]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        navigate(`/storykeep`);
      }
    } else {
      navigate(`/storykeep`);
    }
  }, []);

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
          value={localMenu.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-mydarkgrey">Theme</label>
        <input
          type="text"
          value={localMenu.theme}
          onChange={(e) => handleChange("theme", cleanString(e.target.value))}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
        />
      </div>

      <div>
        <h3 className="text-lg font-bold text-mydarkgrey mb-2">Menu Links</h3>
        {localMenu.optionsPayload.map((link, index) => (
          <div key={index} className="border-b border-mylightgrey/20 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-bold text-mydarkgrey">Link {index + 1}</h4>
              <button
                onClick={() => handleRemoveLink(index)}
                className="text-myorange hover:text-black"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {Object.entries(link).map(([key, value]) => (
              <div key={key} className="mb-2">
                <label className="block text-sm font-bold text-mydarkgrey">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                {typeof value === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      handleLinkChange(index, key as keyof MenuLink, e.target.checked)
                    }
                    className="mt-1 rounded"
                  />
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleLinkChange(index, key as keyof MenuLink, e.target.value)}
                    className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={handleAddLink}
          className="flex items-center text-myblue hover:text-myorange mt-2"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Link
        </button>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-mydarkgrey text-white rounded hover:bg-mydarkgrey/80"
        >
          {unsavedChanges ? `Cancel` : `Close`}
        </button>
        {unsavedChanges && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-myblue text-white rounded hover:bg-myblue/80"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
