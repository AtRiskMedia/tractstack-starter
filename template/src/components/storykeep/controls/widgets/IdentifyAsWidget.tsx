import { useState, useEffect } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { ulid } from "ulid";
import SingleParam from "../fields/SingleParam";
import BeliefEditor from "../manage/BeliefEditor";
import type { FlatNode, BeliefNode } from "@/types";

interface IdentifyAsWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void; // Changed from (string | string[])[] to string[]
}

export default function IdentifyAsWidget({ node, onUpdate }: IdentifyAsWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>("");
  const [targetValues, setTargetValues] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  const params = node.codeHookParams || [];
  const beliefTag = String(params[0] || "");
  const matchingValues = params[1];
  const prompt = String(params[2] || "");

  const isPlaceholder = beliefTag === "BeliefTag";
  const isMatchingPlaceholder = matchingValues === "TARGET_VALUE";

  useEffect(() => {
    if (!isPlaceholder && beliefTag) {
      setSelectedBeliefTag(beliefTag);
    }
    if (Array.isArray(matchingValues)) {
      setTargetValues(matchingValues);
    } else if (typeof matchingValues === "string" && !isMatchingPlaceholder) {
      setTargetValues(matchingValues.split(",").map((val) => val.trim()));
    } else {
      setTargetValues([]);
    }
    setCurrentPrompt(prompt);
  }, [beliefTag, matchingValues, prompt, isPlaceholder, isMatchingPlaceholder]);

  useEffect(() => {
    async function fetchBeliefs() {
      const response = await fetch("/api/turso/getAllBeliefNodes", { method: "GET" });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success) setBeliefs(result.data);
    }
    fetchBeliefs();
  }, []);

  const handleBeliefChange = (selectedValue: string) => {
    setSelectedBeliefTag(selectedValue);
    // Convert targetValues array to string
    onUpdate([selectedValue, targetValues.join(","), currentPrompt]);
  };

  const addCustomValueToTargets = (value: string) => {
    if (!targetValues.includes(value)) {
      const newValues = [...targetValues, value];
      setTargetValues(newValues);
      const tagToUse = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);
      // Convert newValues array to string
      onUpdate([tagToUse, newValues.join(","), currentPrompt]);
    }
  };

  const removeTargetValue = (index: number) => {
    const newValues = targetValues.filter((_, i) => i !== index);
    setTargetValues(newValues);
    const tagToUse = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);
    // Convert newValues array to string
    onUpdate([tagToUse, newValues.join(","), currentPrompt]);
  };

  const handlePromptChange = (value: string) => {
    const sanitizedValue = value.replace(/[\n\r|]/g, "");
    setCurrentPrompt(sanitizedValue);
    const tagToUse = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);
    // Convert targetValues array to string
    onUpdate([tagToUse, targetValues.join(","), sanitizedValue]);
  };

  if (isCreatingBelief || editingBeliefId) {
    const belief: BeliefNode = isCreatingBelief
      ? { id: ulid(), nodeType: "Belief", parentId: null, title: "", slug: "", scale: "custom" }
      : beliefs.find((b) => b.id === editingBeliefId) || {
          id: "",
          nodeType: "Belief",
          parentId: null,
          title: "",
          slug: "",
          scale: "custom",
        };
    return (
      <div className="my-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {isCreatingBelief ? "Create New Belief" : "Edit Belief"}
          </h3>
          <button
            onClick={() => {
              setIsCreatingBelief(false);
              setEditingBeliefId(null);
            }}
            className="text-cyan-700 hover:text-black"
          >
            ← Back
          </button>
        </div>
        <BeliefEditor
          belief={belief}
          create={isCreatingBelief}
          isEmbedded={true}
          onComplete={() => {
            setIsCreatingBelief(false);
            setEditingBeliefId(null);
          }}
          onCancel={() => {
            setIsCreatingBelief(false);
            setEditingBeliefId(null);
          }}
        />
      </div>
    );
  }

  const filteredBeliefs = beliefs.filter((b) => b.scale === "custom");
  const selectedBelief = beliefs.find(
    (b) => b.slug === (selectedBeliefTag || (isPlaceholder ? "" : beliefTag))
  );
  const hasRealSelection = !!selectedBelief || (!isPlaceholder && !!beliefTag);
  const selectValue = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);

  // Calculate excluded values
  const excludedValues =
    selectedBelief?.customValues?.filter((value) => !targetValues.includes(value)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectValue}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className="flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
        >
          <option value="">Select a belief</option>
          {filteredBeliefs.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
        {hasRealSelection ? (
          <button
            onClick={() => {
              const belief = beliefs.find((b) => b.slug === selectValue);
              if (belief) setEditingBeliefId(belief.id);
            }}
            className="text-cyan-700 hover:text-black"
            title="Edit belief"
          >
            <BeakerIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsCreatingBelief(true)}
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800"
          >
            Create New
          </button>
        )}
      </div>

      {hasRealSelection && selectedBelief?.customValues && (
        <>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700 font-bold">Use Values</label>
            {targetValues.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {targetValues.map((value, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-blue-100 rounded-full overflow-hidden"
                  >
                    <span className="px-3 py-1 text-sm">{value}</span>
                    <button
                      onClick={() => removeTargetValue(index)}
                      className="h-full px-2 bg-blue-200 text-blue-500 hover:text-blue-700 hover:bg-blue-300"
                      title="Remove value"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic px-2">Select values to match on</div>
            )}
          </div>

          {excludedValues.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm text-gray-700 font-bold">Excluded</label>
              <div className="flex flex-wrap gap-2">
                {excludedValues.map((value) => (
                  <button
                    key={value}
                    onClick={() => addCustomValueToTargets(value)}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                    title="Click to add to use values"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {hasRealSelection && (
        <SingleParam label="Question Prompt" value={currentPrompt} onChange={handlePromptChange} />
      )}
    </div>
  );
}
