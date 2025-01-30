/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import { Switch } from "@headlessui/react";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { cleanString } from "@/utils/common/helpers.ts";
import { getResourceSetting, processResourceValue } from "@/utils/storykeep/resourceHelpers.ts";
import ActionBuilderField from "../fields/ActionBuilderField";
import type { ResourceNode, ResourceSetting, FullContentMap } from "@/types";

interface ResourceEditorProps {
  resource: ResourceNode;
  create: boolean;
  contentMap: FullContentMap[];
}

const EditableKey = ({
  originalKey,
  onKeyChange,
}: {
  originalKey: string;
  onKeyChange: (oldKey: string, newKey: string) => void;
}) => {
  const [editingKey, setEditingKey] = useState(originalKey);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^a-zA-Z]/g, "");
    setEditingKey(newValue);
  };

  const handleKeyBlur = () => {
    if (editingKey !== originalKey && editingKey.length > 0) {
      onKeyChange(originalKey, editingKey);
    } else if (editingKey.length === 0) {
      setEditingKey(originalKey);
    }
  };

  return (
    <input
      type="text"
      value={editingKey}
      onChange={handleKeyChange}
      onBlur={handleKeyBlur}
      pattern="[A-Za-z]+"
      className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
    />
  );
};

export default function ResourceEditor({ resource, create, contentMap }: ResourceEditorProps) {
  const [localResource, setLocalResource] = useState<ResourceNode>({
    ...resource,
    actionLisp: resource.actionLisp || "", // Ensure actionLisp is initialized to empty string if invalid
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resourceSetting, setResourceSetting] = useState<ResourceSetting | undefined>(
    getResourceSetting(resource?.category || "")
  );

  const handleChange = useCallback((field: keyof ResourceNode, value: any) => {
    setLocalResource((prev) => {
      const processedValue = field === "slug" || field === "category" ? cleanString(value) : value;
      const newResource = { ...prev, [field]: processedValue };
      if (field === "category") {
        const newSetting = getResourceSetting(processedValue);
        setResourceSetting(newSetting);
        if (newSetting) {
          Object.keys(newSetting).forEach((key) => {
            if (!(key in newResource.optionsPayload)) {
              newResource.optionsPayload[key] = newSetting[key].defaultValue;
            }
          });
        }
      }
      return newResource;
    });
    setUnsavedChanges(true);
  }, []);

  const handleKeyChange = useCallback((oldKey: string, newKey: string) => {
    setLocalResource((prev) => {
      const newOptionsPayload = { ...prev.optionsPayload };
      const value = newOptionsPayload[oldKey];
      delete newOptionsPayload[oldKey];
      newOptionsPayload[newKey] = value;
      return { ...prev, optionsPayload: newOptionsPayload };
    });
    setUnsavedChanges(true);
  }, []);

  const handleOptionsPayloadChange = useCallback(
    (key: string, value: any) => {
      setLocalResource((prev) => ({
        ...prev,
        optionsPayload: {
          ...prev.optionsPayload,
          [key]: resourceSetting ? processResourceValue(key, value, resourceSetting) : value,
        },
      }));
      setUnsavedChanges(true);
    },
    [resourceSetting]
  );

  const handleAddOptionPayloadField = useCallback(() => {
    const newKey = `newField${Object.keys(localResource?.optionsPayload || {}).length}`;
    handleOptionsPayloadChange(newKey, "");
  }, [localResource?.optionsPayload, handleOptionsPayloadChange]);

  const handleRemoveOptionPayloadField = useCallback((key: string) => {
    setLocalResource((prev) => {
      const newOptionsPayload = { ...prev.optionsPayload };
      delete newOptionsPayload[key];
      return { ...prev, optionsPayload: newOptionsPayload };
    });
    setUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;
    try {
      setIsSaving(true);

      const response = await fetch("/api/turso/upsertResourceNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localResource),
      });

      if (!response.ok) {
        throw new Error("Failed to save resource changes");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save resource changes");
      }

      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (create) {
          navigate(`/storykeep/manage/resource/${localResource.slug}`);
        }
      }, 7000);
    } catch (error) {
      console.error("Error saving resource:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localResource, create, unsavedChanges, isSaving]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        navigate(`/storykeep`);
      }
    } else {
      navigate(`/storykeep`);
    }
  }, [unsavedChanges]);

  const renderOptionField = useCallback(
    (key: string, value: any) => {
      const setting = resourceSetting && resourceSetting[key];
      const type = setting ? setting.type : typeof value;

      switch (type) {
        case "boolean":
          return (
            <Switch
              checked={value}
              onChange={(newValue) => handleOptionsPayloadChange(key, newValue)}
              className={`${
                value ? "bg-cyan-700" : "bg-gray-300"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
            >
              <span
                className={`${
                  value ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          );
        case "date":
          return (
            <input
              type="datetime-local"
              value={value ? new Date(value * 1000).toISOString().slice(0, -8) : ""}
              onChange={(e) => {
                const date = new Date(e.target.value);
                handleOptionsPayloadChange(key, Math.floor(date.getTime() / 1000));
              }}
              className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
            />
          );
        default:
          return (
            <input
              type="text"
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(e) => handleOptionsPayloadChange(key, e.target.value)}
              className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
            />
          );
      }
    },
    [resourceSetting, handleOptionsPayloadChange]
  );

  return (
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          {create ? "Create Resource" : "Edit Resource"}
        </h3>

        <div className="space-y-6 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 gap-4">
            {["title", "slug", "category", "oneliner"].map((field) => (
              <div key={field}>
                <label className="block text-sm font-bold text-gray-800">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  value={
                    (localResource &&
                      field in localResource &&
                      localResource[field as keyof ResourceNode]) ||
                    ""
                  }
                  onChange={(e) => handleChange(field as keyof ResourceNode, e.target.value)}
                  className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-bold text-gray-800">Action</label>
              <ActionBuilderField
                value={localResource.actionLisp || ""}
                onChange={(value) => handleChange("actionLisp", value)}
                contentMap={contentMap}
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-800">Options Payload</h4>
              {Object.entries(localResource?.optionsPayload || {}).map(([key, value]) => (
                <div key={key} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <EditableKey originalKey={key} onKeyChange={handleKeyChange} />
                    {renderOptionField(key, value)}
                    <button
                      onClick={() => handleRemoveOptionPayloadField(key)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddOptionPayloadField}
                className="flex items-center text-cyan-700 hover:text-cyan-800"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Add Field
              </button>
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
