import { useState, useEffect } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { ulid } from "ulid";
import SingleParam from "../fields/SingleParam";
import BeliefEditor from "../manage/BeliefEditor";
import { widgetMeta } from "@/constants";
import type { FlatNode, BeliefNode } from "@/types";

interface BeliefWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function BeliefWidget({ node, onUpdate }: BeliefWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  const [selectedBeliefTag, setSelectedBeliefTag] = useState<string>("");
  const [currentScaleType, setCurrentScaleType] = useState<string>("");
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Get parameter metadata from the widgetMeta constant
  const widgetInfo = widgetMeta.belief;

  // Ensure params are always strings
  const params = node.codeHookParams || [];
  const beliefTag = String(params[0] || "");
  const scaleType = String(params[1] || "");
  const prompt = String(params[2] || "");

  // Check if beliefTag is the placeholder value
  const isPlaceholder = beliefTag === "BeliefTag";

  // Update local state when props change
  useEffect(() => {
    if (!isPlaceholder && beliefTag) {
      setSelectedBeliefTag(beliefTag);
    }
    setCurrentScaleType(scaleType);
    setCurrentPrompt(prompt);
    setIsInitialized(true);
  }, [beliefTag, scaleType, prompt, isPlaceholder]);

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
    if (!isInitialized) return;
    setSelectedBeliefTag(selectedValue);
    const selectedBelief = beliefs.find((b) => b.slug === selectedValue);
    if (selectedBelief) {
      setCurrentScaleType(selectedBelief.scale || "");
      onUpdate([selectedValue, selectedBelief.scale || "", currentPrompt]);
    } else {
      onUpdate([selectedValue, "", currentPrompt]);
    }
  };

  const handlePromptChange = (value: string) => {
    if (!isInitialized) return;
    // Sanitize the input value (remove newlines and pipe characters)
    const sanitizedValue = value.replace(/[\n\r|]/g, "");
    setCurrentPrompt(sanitizedValue);

    // Use the actual selected tag (from state) or the original belief tag as fallback
    const tagToUse = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);
    onUpdate([tagToUse, currentScaleType, sanitizedValue]);
  };

  if (isCreatingBelief || editingBeliefId) {
    const belief: BeliefNode = isCreatingBelief
      ? { id: ulid(), nodeType: "Belief", parentId: null, title: "", slug: "", scale: "" }
      : beliefs.find((b) => b.id === editingBeliefId) || {
          id: "",
          nodeType: "Belief",
          parentId: null,
          title: "",
          slug: "",
          scale: "",
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

  // Find the selected belief (if any)
  const selectedBelief = beliefs.find(
    (b) => b.slug === (selectedBeliefTag || (isPlaceholder ? "" : beliefTag))
  );

  // Determine if we have a real selection - either from state or props
  const hasRealSelection = !!selectedBelief || (!isPlaceholder && !!beliefTag);

  // Calculate the current value to show in the select dropdown
  const selectValue = selectedBeliefTag || (isPlaceholder ? "" : beliefTag);

  // Get scale type display names
  const scaleTypeNames: Record<string, string> = {
    yn: "Yes/No",
    likert: "Likert Scale (5-point)",
    agreement: "Agreement (2-point)",
    interest: "Interest (2-point)",
    tf: "True/False",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectValue}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className="flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
          disabled={hasRealSelection && !isPlaceholder}
        >
          <option value="">Select a belief</option>
          {beliefs.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
        {hasRealSelection && !isPlaceholder ? (
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
            Create New Belief
          </button>
        )}
      </div>

      {hasRealSelection && (
        <>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">{widgetInfo.parameters[1].label}</label>
            <select
              value={selectedBelief?.scale || currentScaleType}
              className="w-full rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 bg-gray-100"
              disabled={true}
            >
              {Object.entries(scaleTypeNames).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
              <option value="custom">Custom Values</option>
            </select>
          </div>

          <SingleParam
            label={widgetInfo.parameters[2].label}
            value={currentPrompt}
            onChange={handlePromptChange}
          />
        </>
      )}
    </div>
  );
}
