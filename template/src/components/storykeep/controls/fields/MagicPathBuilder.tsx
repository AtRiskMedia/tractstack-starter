import { useState, useCallback } from "react";
import { XMarkIcon, PlusIcon, BeakerIcon } from "@heroicons/react/24/outline";
import type { BeliefNode } from "@/types";
import { heldBeliefsScales } from "@/utils/common/beliefs";

interface MagicPathBuilderProps {
  paths: Record<string, string[]>;
  setPaths: (paths: Record<string, string[]>) => void;
  availableBeliefs: BeliefNode[];
  isShowCondition: boolean;
  onSaveCustomValue?: (beliefId: string, customValues: string[]) => void;
}

const MagicPathBuilder = ({
  paths,
  setPaths,
  availableBeliefs,
  isShowCondition,
  onSaveCustomValue,
}: MagicPathBuilderProps) => {
  const [editingCustomBeliefId, setEditingCustomBeliefId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [customValues, setCustomValues] = useState<string[]>([]);

  // Handle entering custom value edit mode
  const handleEditCustomValues = useCallback((beliefId: string, currentValues: string[]) => {
    setEditingCustomBeliefId(beliefId);
    setCustomValues(currentValues);
  }, []);

  // Handle saving custom values
  const handleSaveCustomValues = useCallback(async () => {
    if (!editingCustomBeliefId || !onSaveCustomValue) return;

    const belief = availableBeliefs.find((b) => b.id === editingCustomBeliefId);
    if (!belief) return;

    // Save custom values through the provided callback
    onSaveCustomValue(editingCustomBeliefId, customValues);
    setEditingCustomBeliefId(null);
    setCustomValues([]);
  }, [editingCustomBeliefId, customValues, availableBeliefs, onSaveCustomValue]);

  // Get valid values for a belief
  const getValidValuesForBelief = useCallback(
    (beliefSlug: string): string[] => {
      const belief = availableBeliefs.find((b) => b.slug === beliefSlug);
      if (!belief) return [];

      if (belief.scale === "custom" && belief.customValues) {
        return ["*", ...belief.customValues];
      }

      const scaleKey = belief.scale as keyof typeof heldBeliefsScales;
      const scale = heldBeliefsScales[scaleKey];
      return ["*", ...(scale ? scale.map((option) => option.slug) : [])];
    },
    [availableBeliefs]
  );

  // Handle adding a new belief path
  const handleAddPath = useCallback(() => {
    setPaths({
      ...paths,
      "": ["*"],
    });
  }, [paths, setPaths]);

  // Handle changing the belief selection
  const handleBeliefChange = useCallback(
    (oldKey: string, newKey: string) => {
      const updatedPaths = { ...paths };
      delete updatedPaths[oldKey];
      if (newKey) {
        updatedPaths[newKey] = ["*"];
      }
      setPaths(updatedPaths);
    },
    [paths, setPaths]
  );

  // Handle changing value selection for a belief
  const handleValueChange = useCallback(
    (beliefKey: string, valueIndex: number, newValue: string) => {
      const values = paths[beliefKey];
      const updatedPaths = { ...paths };
      updatedPaths[beliefKey] = [...values];
      updatedPaths[beliefKey][valueIndex] = newValue;
      setPaths(updatedPaths);
    },
    [paths, setPaths]
  );

  // Handle removing a value from a belief
  const handleRemoveValue = useCallback(
    (beliefKey: string, valueIndex: number) => {
      const values = paths[beliefKey];
      const updatedPaths = { ...paths };
      updatedPaths[beliefKey] = values.filter((_, i) => i !== valueIndex);

      if (updatedPaths[beliefKey].length === 0) {
        delete updatedPaths[beliefKey];
      }
      setPaths(updatedPaths);
    },
    [paths, setPaths]
  );

  // Render custom value editor mode
  if (editingCustomBeliefId) {
    const belief = availableBeliefs.find((b) => b.id === editingCustomBeliefId);
    if (!belief) return null;

    return (
      <div className="p-4 border rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Edit Custom Values for {belief.title}</h3>
          <button
            onClick={() => setEditingCustomBeliefId(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Add a custom value..."
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <button
              onClick={() => {
                if (customValue.trim()) {
                  setCustomValues((prev) => [...prev, customValue.trim()]);
                  setCustomValue("");
                }
              }}
              className="p-2 bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {customValues.map((value, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full"
              >
                <span>{value}</span>
                <button
                  onClick={() => setCustomValues((prev) => prev.filter((_, i) => i !== index))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingCustomBeliefId(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCustomValues}
              className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800"
            >
              Save Custom Values
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">
          {isShowCondition ? "Show Content When" : "Hide Content When"}
        </h3>
        <button
          onClick={handleAddPath}
          className="p-1 bg-cyan-700 text-white rounded-md hover:bg-cyan-800"
          title={`Add ${isShowCondition ? "Show" : "Hide"} Condition`}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {Object.entries(paths).map(([key, values]) => (
        <div key={key} className="p-4 border rounded-lg bg-white">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Select Belief</label>
              <select
                value={key}
                onChange={(e) => handleBeliefChange(key, e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a belief</option>
                {availableBeliefs.map((belief) => (
                  <option key={belief.slug} value={belief.slug}>
                    {belief.title}
                  </option>
                ))}
              </select>
            </div>

            {key && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Select Values</label>
                <div className="flex flex-wrap gap-2">
                  {values.map((value, valueIndex) => {
                    const validValues = getValidValuesForBelief(key);
                    const belief = availableBeliefs.find((b) => b.slug === key);

                    return (
                      <div key={valueIndex} className="flex items-center gap-1">
                        <select
                          value={value}
                          onChange={(e) => handleValueChange(key, valueIndex, e.target.value)}
                          className="px-3 py-2 border rounded-md"
                        >
                          {validValues.map((val) => (
                            <option key={val} value={val}>
                              {val === "*" ? "Match Any Value" : val}
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRemoveValue(key, valueIndex)}
                            className="text-gray-500 hover:text-gray-700"
                            title="Remove value"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                          {valueIndex === values.length - 1 && (
                            <button
                              onClick={() => {
                                const updatedPaths = { ...paths };
                                updatedPaths[key] = [...values, "*"];
                                setPaths(updatedPaths);
                              }}
                              className="text-gray-500 hover:text-gray-700"
                              title="Add value"
                            >
                              <PlusIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        {belief?.scale === "custom" && valueIndex === 0 && (
                          <button
                            onClick={() =>
                              handleEditCustomValues(belief.id, belief.customValues || [])
                            }
                            className="ml-2 text-cyan-700 hover:text-cyan-800"
                            title="Edit custom values"
                          >
                            <BeakerIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MagicPathBuilder;
