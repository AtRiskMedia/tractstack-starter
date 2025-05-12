import { useState, useCallback, useMemo } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import LinkIcon from "@heroicons/react/24/outline/LinkIcon";
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
  const [selectedLinkedBelief, setSelectedLinkedBelief] = useState<string>("");

  // Get belief keys (excluding special keys)
  const beliefKeys = Object.keys(paths).filter(
    (key) => key !== "MATCH-ACROSS" && key !== "LINKED-BELIEFS"
  );

  // Get linked beliefs array
  const linkedBeliefs = useMemo(() => {
    return Array.isArray(paths["LINKED-BELIEFS"]) ? paths["LINKED-BELIEFS"] : [];
  }, [paths]);

  // Calculate available beliefs for linking (beliefs not in current path)
  const availableLinkedBeliefs = useMemo(() => {
    return availableBeliefs.filter(
      (belief) =>
        // Not already selected in the current path
        !beliefKeys.includes(belief.slug) &&
        // Not already in the linked beliefs
        !linkedBeliefs.includes(belief.slug)
    );
  }, [availableBeliefs, beliefKeys, linkedBeliefs]);

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

        // If this belief was in LINKED-BELIEFS, remove it
        if (updatedPaths["LINKED-BELIEFS"] && Array.isArray(updatedPaths["LINKED-BELIEFS"])) {
          updatedPaths["LINKED-BELIEFS"] = updatedPaths["LINKED-BELIEFS"].filter(
            (slug) => slug !== newKey
          );

          // Remove the LINKED-BELIEFS key if it's empty
          if (updatedPaths["LINKED-BELIEFS"].length === 0) {
            delete updatedPaths["LINKED-BELIEFS"];
          }
        }
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

  // Get the current match-across beliefs array
  const getMatchAcrossBeliefsArray = useCallback((): string[] => {
    return paths["MATCH-ACROSS"] || [];
  }, [paths]);

  // Handle toggling a belief in match-across
  const handleToggleMatchAcross = useCallback(
    (beliefKey: string) => {
      const currentMatchAcross = getMatchAcrossBeliefsArray();
      const updatedPaths = { ...paths };

      if (currentMatchAcross.includes(beliefKey)) {
        // Remove from match-across
        updatedPaths["MATCH-ACROSS"] = currentMatchAcross.filter((key) => key !== beliefKey);
        if (updatedPaths["MATCH-ACROSS"].length === 0) {
          delete updatedPaths["MATCH-ACROSS"];
        }
      } else {
        // Add to match-across
        updatedPaths["MATCH-ACROSS"] = [...currentMatchAcross, beliefKey];
      }

      setPaths(updatedPaths);
    },
    [paths, setPaths, getMatchAcrossBeliefsArray]
  );

  // Add a belief to the linked beliefs array
  const handleAddLinkedBelief = useCallback(() => {
    if (!selectedLinkedBelief) return;

    const updatedPaths = { ...paths };
    if (!updatedPaths["LINKED-BELIEFS"]) {
      updatedPaths["LINKED-BELIEFS"] = [];
    }

    // Add the selected belief to the linked beliefs array if not already present
    if (!updatedPaths["LINKED-BELIEFS"].includes(selectedLinkedBelief)) {
      updatedPaths["LINKED-BELIEFS"] = [...updatedPaths["LINKED-BELIEFS"], selectedLinkedBelief];
    }

    setPaths(updatedPaths);
    setSelectedLinkedBelief("");
  }, [paths, setPaths, selectedLinkedBelief]);

  // Remove a belief from the linked beliefs array
  const handleRemoveLinkedBelief = useCallback(
    (beliefSlug: string) => {
      const updatedPaths = { ...paths };
      if (updatedPaths["LINKED-BELIEFS"]) {
        updatedPaths["LINKED-BELIEFS"] = updatedPaths["LINKED-BELIEFS"].filter(
          (slug) => slug !== beliefSlug
        );

        // Remove the LINKED-BELIEFS key if it's empty
        if (updatedPaths["LINKED-BELIEFS"].length === 0) {
          delete updatedPaths["LINKED-BELIEFS"];
        }
      }

      setPaths(updatedPaths);
    },
    [paths, setPaths]
  );

  // Check if a belief is in match-across
  const isBeliefInMatchAcross = useCallback(
    (beliefKey: string): boolean => {
      return getMatchAcrossBeliefsArray().includes(beliefKey);
    },
    [getMatchAcrossBeliefsArray]
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

  // Determine if we have completed belief selections (no empty entries)
  const hasCompletedBeliefSelections = beliefKeys.every((key) => key !== "");

  // Count the number of valid beliefs (non-empty keys)
  const validBeliefCount = beliefKeys.filter((key) => key !== "").length;

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

      {/* Only show Match Across section for Show Conditions with multiple VALID beliefs */}
      {isShowCondition && validBeliefCount > 1 && hasCompletedBeliefSelections && (
        <div className="p-4 border rounded-lg bg-white mb-4">
          <div className="flex items-center mb-2">
            <h4 className="font-bold text-md">Match Across Logic</h4>
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              OR between selected beliefs
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Select beliefs to match with OR logic (any one can match). Unselected beliefs use AND
            logic (all must match).
          </p>
          <div className="flex flex-wrap gap-2">
            {beliefKeys
              .filter((key) => key !== "")
              .map((key) => (
                <button
                  key={key}
                  onClick={() => handleToggleMatchAcross(key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    isBeliefInMatchAcross(key)
                      ? "bg-cyan-600 text-white hover:bg-cyan-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {availableBeliefs.find((b) => b.slug === key)?.title || key}
                </button>
              ))}
          </div>
        </div>
      )}

      {beliefKeys.map((key) => (
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
                  {paths[key].map((value, valueIndex) => {
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
                          {valueIndex === paths[key].length - 1 && (
                            <button
                              onClick={() => {
                                const updatedPaths = { ...paths };
                                updatedPaths[key] = [...paths[key], "*"];
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

      {/* Linked Beliefs section - always show */}
      {isShowCondition && (
        <div className="p-4 border rounded-lg bg-white mb-4">
          <div className="flex items-center mb-2">
            <h4 className="font-bold text-md">Linked Beliefs</h4>
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center">
              <LinkIcon className="h-3 w-3 mr-1" />
              Unset together
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Select beliefs to link with this condition. When any belief is unset, all linked beliefs
            will be unset together.
          </p>

          {/* Dropdown to select new linked beliefs */}
          <div className="flex gap-2 mb-3">
            <select
              value={selectedLinkedBelief}
              onChange={(e) => setSelectedLinkedBelief(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="">Select a belief to link</option>
              {availableLinkedBeliefs.map((belief) => (
                <option key={belief.slug} value={belief.slug}>
                  {belief.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddLinkedBelief}
              disabled={!selectedLinkedBelief}
              className={`p-2 rounded-md ${
                selectedLinkedBelief
                  ? "bg-cyan-600 text-white hover:bg-cyan-700"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Display linked beliefs as tags */}
          <div className="flex flex-wrap gap-2">
            {linkedBeliefs.map((beliefSlug) => {
              const belief = availableBeliefs.find((b) => b.slug === beliefSlug);
              return (
                <div
                  key={beliefSlug}
                  className="flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full"
                >
                  <LinkIcon className="h-3 w-3" />
                  <span>{belief?.title || beliefSlug}</span>
                  <button
                    onClick={() => handleRemoveLinkedBelief(beliefSlug)}
                    className="text-cyan-600 hover:text-cyan-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {linkedBeliefs.length === 0 && (
              <p className="text-sm text-gray-500 italic">No linked beliefs selected</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicPathBuilder;
