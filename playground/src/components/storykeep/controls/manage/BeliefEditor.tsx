import { useState, useCallback } from "react";
import { ulid } from "ulid";
import { navigate } from "astro:transitions/client";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { cleanAllowCapsString } from "@/utils/common/helpers.ts";
import { heldBeliefsScales, heldBeliefsTitles } from "@/utils/common/beliefs.ts";
import type { BeliefNode, TursoQuery, BeliefOptionDatum } from "@/types.ts";

type ScaleType = keyof typeof heldBeliefsScales | "custom" | "";

interface BeliefEditorProps {
  belief: BeliefNode;
  create: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

function createBeliefUpdateQuery(id: string, belief: BeliefNode): TursoQuery {
  return {
    sql: `UPDATE beliefs
          SET title = ?, 
              slug = ?, 
              scale = ?,
              custom_values = ?
          WHERE id = ?`,
    args: [
      belief.title,
      belief.slug,
      belief.scale,
      belief.customValues ? belief.customValues.join(",") : null,
      id,
    ],
  };
}

function createBeliefInsertQuery(belief: BeliefNode): TursoQuery {
  return {
    sql: `INSERT INTO beliefs (
            id,
            title,
            slug,
            scale,
            custom_values
          ) VALUES (?, ?, ?, ?, ?)`,
    args: [
      belief.id,
      belief.title,
      belief.slug,
      belief.scale,
      belief.customValues ? belief.customValues.join(",") : null,
    ],
  };
}

function compareBeliefFields(current: BeliefNode, original: BeliefNode): boolean {
  return (
    current.title !== original.title ||
    current.slug !== original.slug ||
    current.scale !== original.scale ||
    JSON.stringify(current.customValues) !== JSON.stringify(original.customValues)
  );
}

export default function BeliefEditor({
  belief,
  create,
  onComplete,
  onCancel,
  isEmbedded = false,
}: BeliefEditorProps) {
  const [localBelief, setLocalBelief] = useState<BeliefNode>(
    create ? { ...belief, id: ulid() } : belief
  );
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customValues, setCustomValues] = useState<string[]>(belief.customValues || []);

  const handleChange = useCallback(
    (field: keyof BeliefNode, value: any) => {
      setLocalBelief((prev) => {
        const processedValue = field === "slug" ? cleanAllowCapsString(value) : value;
        const updatedBelief = { ...prev, [field]: processedValue };
        if (field === "scale") {
          if (value === "custom") {
            updatedBelief.customValues = customValues;
          } else {
            updatedBelief.customValues = [];
            setCustomValues([]);
          }
        }
        return updatedBelief;
      });
      setUnsavedChanges(true);
    },
    [customValues]
  );

  const handleAddCustomValue = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!customValue.trim()) return;

      const newValue = customValue.trim();
      setCustomValues((prev) => [...prev, newValue]);
      setLocalBelief((prev) => ({
        ...prev,
        customValues: [...(prev.customValues || []), newValue],
      }));
      setCustomValue("");
      setUnsavedChanges(true);
    },
    [customValue]
  );

  const handleRemoveCustomValue = useCallback((index: number) => {
    setCustomValues((prev) => {
      const newValues = prev.filter((_, i) => i !== index);
      return newValues;
    });
    setLocalBelief((prev) => ({
      ...prev,
      customValues: prev.customValues?.filter((_, i) => i !== index),
    }));
    setUnsavedChanges(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddCustomValue();
      }
    },
    [handleAddCustomValue]
  );

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;
    try {
      setIsSaving(true);
      const queries: TursoQuery[] = [];

      const updatedBelief = {
        ...localBelief,
        customValues:
          localBelief.scale === "custom"
            ? customValues.filter((value) => value.trim() !== "")
            : undefined,
      };

      if (create) {
        queries.push(createBeliefInsertQuery(updatedBelief));
      } else if (compareBeliefFields(updatedBelief, belief)) {
        queries.push(createBeliefUpdateQuery(belief.id, updatedBelief));
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
          throw new Error("Failed to save belief changes");
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to save belief changes");
        }
      }

      setUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (create) {
          if (onComplete) {
            onComplete();
          } else {
            navigate(`/storykeep/content/beliefs/${updatedBelief.id}`);
          }
        }
      }, 2000);
    } catch (error) {
      console.error("Error saving belief:", error);
    } finally {
      setIsSaving(false);
    }
  }, [localBelief, belief, unsavedChanges, isSaving, create, customValues, onComplete]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        if (onCancel) {
          onCancel();
        } else {
          navigate(`/storykeep`);
        }
      }
    } else {
      if (onCancel) {
        onCancel();
      } else {
        navigate(`/storykeep`);
      }
    }
  }, [unsavedChanges, onCancel]);

  const scaleOptions: Array<{ value: ScaleType; label: string }> = [
    { value: "", label: "Select a scale" },
    { value: "likert", label: "Likert Scale (1-5)" },
    { value: "agreement", label: "Agreement (Yes/No)" },
    { value: "interest", label: "Interest" },
    { value: "yn", label: "Yes/No" },
    { value: "tf", label: "True/False" },
    { value: "custom", label: "Custom Values" },
  ];

  const renderScalePreview = (scale: string) => {
    if (scale === "" || scale === "custom" || !(scale in heldBeliefsScales)) return null;

    const scaleKey = scale as keyof typeof heldBeliefsScales;
    const options = heldBeliefsScales[scaleKey];

    return (
      <div className="mt-4">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          {heldBeliefsTitles[scaleKey]}
        </label>
        <div className="flex flex-wrap gap-2">
          {options.map((option: BeliefOptionDatum) => (
            <div
              key={option.id}
              className={`px-3 py-1 rounded-full text-sm ${option.color} text-gray-800`}
            >
              {option.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const content = (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Basic Fields */}
          {["title", "slug"].map((field) => (
            <div key={field}>
              <label className="block text-sm font-bold text-gray-800">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <input
                type="text"
                value={(localBelief[field as keyof BeliefNode] as string) || ""}
                onChange={(e) => handleChange(field as keyof BeliefNode, e.target.value)}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              />
            </div>
          ))}

          {/* Scale Field */}
          <div>
            <label className="block text-sm font-bold text-gray-800">Scale</label>
            {isEmbedded ? (
              <div className="mt-1 block w-full p-2 text-gray-700 sm:text-sm">
                {scaleOptions.find((option) => option.value === localBelief.scale)?.label || "None"}
              </div>
            ) : (
              <select
                value={localBelief.scale || ""}
                onChange={(e) => handleChange("scale", e.target.value as ScaleType)}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
              >
                {scaleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scale Preview */}
          {renderScalePreview(localBelief.scale)}

          {/* Custom Values Section */}
          {localBelief.scale === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Custom Values</label>
                <form onSubmit={handleAddCustomValue} className="flex gap-2">
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a custom value..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!customValue.trim()}
                    className="px-4 py-2 bg-cyan-700 text-white rounded-md hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </form>
              </div>

              {customValues.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customValues.map((value, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      <span>{value}</span>
                      <button
                        onClick={() => handleRemoveCustomValue(index)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
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

        {/* Status Messages */}
        {(unsavedChanges || saveSuccess) && (
          <div className={`mt-4 p-4 rounded-md ${unsavedChanges ? "bg-amber-50" : "bg-green-50"}`}>
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
    </>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          {create ? "Create Belief" : "Edit Belief"}
        </h3>
        {content}
      </div>
    </div>
  );
}
