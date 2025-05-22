/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { ulid } from "ulid";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ActionBuilderField from "@/components/storykeep/controls/fields/ActionBuilderField.tsx";
import type { MenuNode, MenuLink, FullContentMap } from "@/types.ts";

interface MenuEditorProps {
  menu: MenuNode;
  create: boolean;
  contentMap: FullContentMap[];
  embedded?: boolean;
}

export default function MenuEditor({
  menu,
  create,
  contentMap,
  embedded = false,
}: MenuEditorProps) {
  const [originalMenu] = useState<MenuNode>({ ...menu });
  const [localMenu, setLocalMenu] = useState<MenuNode>({
    ...menu,
    theme: "default", // Always set to "default" until UI is added
    id: create ? ulid() : menu.id,
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback((field: keyof MenuNode, value: any) => {
    setLocalMenu((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  }, []);

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
        { name: "", description: "", featured: true, actionLisp: "" },
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

      const response = await fetch("/api/turso/upsertMenuNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localMenu),
      });

      if (!response.ok) {
        throw new Error("Failed to save menu changes");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save menu changes");
      }

      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (create && !embedded) {
          navigate(`/storykeep/content/menus/${localMenu.id}`);
        }
      }, 100);
    } catch (error) {
      console.error("Error saving menu:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localMenu, create, unsavedChanges, isSaving, embedded]);

  const handleCancel = useCallback(() => {
    if (embedded) {
      // In embedded mode, reset to original values
      setLocalMenu({ ...originalMenu });
      setUnsavedChanges(false);
    } else {
      // In standalone mode, navigate away with confirmation
      if (unsavedChanges) {
        if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
          navigate(`/storykeep`);
        }
      } else {
        navigate(`/storykeep`);
      }
    }
  }, [unsavedChanges, embedded, originalMenu]);

  const UnsavedChangesAlert = () => (
    <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-amber-50">
      <p className="text-gray-800 font-bold">
        <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2 text-amber-500" />
        You have unsaved changes
      </p>
      <div className="flex space-x-3">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          {embedded ? "Reset" : "Cancel"}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );

  const SuccessAlert = () => (
    <div className="mb-4 p-3 rounded-md bg-green-50">
      <p className="text-gray-800 font-bold">
        <CheckCircleIcon className="inline-block h-5 w-5 mr-2 text-green-500" />
        Changes saved successfully
      </p>
    </div>
  );

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        {/* Show status alerts at the top */}
        {saveSuccess && <SuccessAlert />}
        {unsavedChanges && <UnsavedChangesAlert />}

        {/* Show title and info box only when not embedded */}
        {!embedded && (
          <>
            <h3 className="font-bold font-action text-xl mb-4">
              {create ? "Create Menu" : "Edit Menu"}
            </h3>
            <div className="py-2.5 mb-8 max-w-2xl">
              <div className="p-3.5 border-2 border-dashed bg-slate-50">
                <div className="text-base text-mydarkgrey leading-8">
                  <p>
                    Remember to link this menu to each page (story fragment) where it's supposed to
                    be! And create as many menus as you like.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-6 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800">Administrative Title</label>
              <input
                type="text"
                value={localMenu.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-800">Menu Links</h4>
              {localMenu.optionsPayload.map((link, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-md font-bold text-gray-800">Link {index + 1}</h5>
                    <button
                      onClick={() => handleRemoveLink(index)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800">Name</label>
                      <input
                        type="text"
                        value={link.name}
                        onChange={(e) => handleLinkChange(index, "name", e.target.value)}
                        className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800">Description</label>
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => handleLinkChange(index, "description", e.target.value)}
                        className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800">Action</label>
                      <ActionBuilderField
                        value={link.actionLisp}
                        onChange={(value) => handleLinkChange(index, "actionLisp", value)}
                        contentMap={contentMap}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`featured-${index}`}
                        checked={link.featured}
                        onChange={(e) => handleLinkChange(index, "featured", e.target.checked)}
                        className="rounded border-gray-300 text-cyan-700 focus:ring-cyan-700"
                      />
                      <label htmlFor={`featured-${index}`} className="text-sm text-gray-800">
                        Featured
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddLink}
                className="flex items-center text-cyan-700 hover:text-cyan-800"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Add Link
              </button>
            </div>
          </div>

          {/* Only show bottom buttons and alerts when not embedded */}
          {!embedded && (
            <>
              {!unsavedChanges && (
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Bottom alerts with buttons - only shown in non-embedded mode */}
              {unsavedChanges && (
                <div className="flex justify-between items-center mt-4 p-3 rounded-md bg-amber-50">
                  <p className="text-gray-800 font-bold">
                    <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2 text-amber-500" />
                    You have unsaved changes
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {saveSuccess && !unsavedChanges && (
                <div className="mt-4 p-3 rounded-md bg-green-50">
                  <p className="text-gray-800 font-bold">
                    <CheckCircleIcon className="inline-block h-5 w-5 mr-2 text-green-500" />
                    Changes saved successfully
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
