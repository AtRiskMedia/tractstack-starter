import { useState, useEffect } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { ulid } from "ulid";
import SingleParam from "../fields/SingleParam";
import MultiParam from "../fields/MultiParam";
import BeliefEditor from "../manage/BeliefEditor";
import { widgetMeta } from "@/constants";
import type { FlatNode, BeliefNode } from "@/types";

interface IdentifyAsWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function IdentifyAsWidget({ node, onUpdate }: IdentifyAsWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>("");
  const [targetValues, setTargetValues] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  // Get parameter definitions from metadata
  const paramDefs = widgetMeta.identifyAs.parameters;

  // Sync state with node.codeHookParams
  useEffect(() => {
    const params = node.codeHookParams || [];
    const beliefTag = String(params[0] || "BeliefTag");
    const matchingValues = params[1] || "TARGET_VALUE";
    const prompt = String(params[2] || "");

    if (beliefTag !== "BeliefTag") {
      setSelectedBeliefTag(beliefTag);
    } else {
      setSelectedBeliefTag("");
    }

    if (Array.isArray(matchingValues)) {
      setTargetValues(matchingValues.map(String));
    } else if (typeof matchingValues === "string" && matchingValues !== "TARGET_VALUE") {
      setTargetValues(
        matchingValues
          .split(",")
          .map((val) => val.trim())
          .filter(Boolean)
      );
    } else {
      setTargetValues([]);
    }

    setCurrentPrompt(prompt);
  }, [node]);

  // Fetch beliefs
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
    const beliefTagToUse = selectedValue || "BeliefTag";
    const targetParam = targetValues.length > 0 ? targetValues.join(",") : "TARGET_VALUE";
    onUpdate([beliefTagToUse, targetParam, currentPrompt]);
  };

  const handleTargetValuesChange = (values: string[]) => {
    setTargetValues(values);
    const beliefTagToUse = selectedBeliefTag || "BeliefTag";
    const targetParam = values.length > 0 ? values.join(",") : "TARGET_VALUE";
    onUpdate([beliefTagToUse, targetParam, currentPrompt]);
  };

  const handlePromptChange = (value: string) => {
    const sanitizedValue = value.replace(/[\n\r|]/g, "");
    setCurrentPrompt(sanitizedValue);
    const beliefTagToUse = selectedBeliefTag || "BeliefTag";
    const targetParam = targetValues.length > 0 ? targetValues.join(",") : "TARGET_VALUE";
    onUpdate([beliefTagToUse, targetParam, sanitizedValue]);
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
  const selectedBelief = beliefs.find((b) => b.slug === selectedBeliefTag);
  const hasRealSelection = !!selectedBeliefTag; // Only show additional fields if a belief is selected

  // Calculate excluded values
  const excludedValues =
    selectedBelief?.customValues?.filter((value) => !targetValues.includes(value)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectedBeliefTag}
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
              const belief = beliefs.find((b) => b.slug === selectedBeliefTag);
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

      {hasRealSelection && (
        <>
          <MultiParam
            label={paramDefs[1].label}
            values={targetValues}
            onChange={handleTargetValuesChange}
          />

          {excludedValues.length > 0 && (
            <div className="space-y-1">
              <label className="block text-sm text-gray-700 font-bold">Available Values</label>
              <div className="flex flex-wrap gap-2">
                {excludedValues.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      const newValues = [...targetValues, value];
                      handleTargetValuesChange(newValues);
                    }}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                    title="Click to add to selected values"
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
        <SingleParam
          label={paramDefs[2].label}
          value={currentPrompt}
          onChange={handlePromptChange}
        />
      )}
    </div>
  );
}
