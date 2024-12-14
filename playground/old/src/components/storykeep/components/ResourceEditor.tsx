/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import { Switch } from "@headlessui/react";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { tursoClient } from "../../../api/tursoClient";
import { cleanString } from "../../../utils/helpers";
import { getResourceSetting, processResourceValue } from "../../../constants";
import type { ResourceDatum, ResourceSetting, TursoQuery } from "../../../types";

interface ResourceEditorProps {
  resource: ResourceDatum;
  create: boolean;
}

function createResourceUpdateQuery(id: string, resource: ResourceDatum): TursoQuery {
  return {
    sql: `UPDATE resource 
          SET title = ?, 
              slug = ?, 
              category_slug = ?,
              oneliner = ?,
              options_payload = ?,
              action_lisp = ?
          WHERE id = ?`,
    args: [
      resource.title,
      resource.slug,
      resource.category || null,
      resource.oneliner,
      JSON.stringify(resource.optionsPayload),
      resource.actionLisp || null,
      id,
    ],
  };
}

function createResourceInsertQuery(resource: ResourceDatum): TursoQuery {
  return {
    sql: `INSERT INTO resource (
            id,
            title,
            slug,
            category_slug,
            oneliner,
            options_payload,
            action_lisp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      resource.id,
      resource.title,
      resource.slug,
      resource.category || null,
      resource.oneliner,
      JSON.stringify(resource.optionsPayload),
      resource.actionLisp || null,
    ],
  };
}

function compareResourceFields(current: ResourceDatum, original: ResourceDatum): boolean {
  return (
    current.title !== original.title ||
    current.slug !== original.slug ||
    current.category !== original.category ||
    current.oneliner !== original.oneliner ||
    current.actionLisp !== original.actionLisp ||
    JSON.stringify(current.optionsPayload) !== JSON.stringify(original.optionsPayload)
  );
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
      setEditingKey(originalKey); // Reset to original if empty
    }
  };

  return (
    <input
      type="text"
      value={editingKey}
      onChange={handleKeyChange}
      onBlur={handleKeyBlur}
      pattern="[A-Za-z]+"
      className="w-1/3 rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
    />
  );
};

export default function ResourceEditor({ resource, create }: ResourceEditorProps) {
  const [localResource, setLocalResource] = useState<ResourceDatum>(resource);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resourceSetting, setResourceSetting] = useState<ResourceSetting | undefined>(
    getResourceSetting(resource.category || "")
  );

  const handleChange = useCallback((field: keyof ResourceDatum, value: any) => {
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
    const newKey = `newField${Object.keys(localResource.optionsPayload || {}).length}`;
    handleOptionsPayloadChange(newKey, "");
  }, [localResource.optionsPayload, handleOptionsPayloadChange]);

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
      const queries: TursoQuery[] = [];
      if (create) {
        queries.push(createResourceInsertQuery(localResource));
      } else if (compareResourceFields(localResource, resource)) {
        queries.push(createResourceUpdateQuery(resource.id, localResource));
      }
      if (queries.length > 0) {
        const result = await tursoClient.execute(queries);
        if (!result) {
          throw new Error("Failed to save resource changes");
        }
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
  }, [localResource, resource, unsavedChanges, isSaving, create]);

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
                value ? "bg-myorange" : "bg-mydarkgrey"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
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
              className="w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
            />
          );
        default:
          return (
            <input
              type="text"
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(e) => handleOptionsPayloadChange(key, e.target.value)}
              className="w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
            />
          );
      }
    },
    [resourceSetting, handleOptionsPayloadChange]
  );

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

      {["title", "slug", "category", "oneliner", "actionLisp"].map((field) => (
        <div key={field}>
          <label className="block text-sm font-bold text-mydarkgrey">
            {field.charAt(0).toUpperCase() + field.slice(1)}
          </label>
          <input
            type="text"
            value={localResource[field as keyof ResourceDatum] || ""}
            onChange={(e) => handleChange(field as keyof ResourceDatum, e.target.value)}
            className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
          />
        </div>
      ))}

      <div>
        <h3 className="text-lg font-bold text-mydarkgrey mb-2">Options Payload</h3>
        {Object.entries(localResource.optionsPayload || {}).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 mb-2">
            <EditableKey originalKey={key} onKeyChange={handleKeyChange} />
            {renderOptionField(key, value)}
            <button
              onClick={() => handleRemoveOptionPayloadField(key)}
              className="text-myorange hover:text-black"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddOptionPayloadField}
          className="flex items-center text-myblue hover:text-myorange mt-2"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Field
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
