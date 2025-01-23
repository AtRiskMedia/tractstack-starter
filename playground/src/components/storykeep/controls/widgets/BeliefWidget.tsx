import { useState, useEffect } from "react";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { ulid } from "ulid";
import SingleParam from "../fields/SingleParam";
import BeliefEditor from "../manage/BeliefEditor";
import type { FlatNode, BeliefNode } from "@/types";

interface BeliefWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

export default function BeliefWidget({ node, onUpdate }: BeliefWidgetProps) {
  const [beliefs, setBeliefs] = useState<BeliefNode[]>([]);
  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  
  // Ensure params are always strings
  const params = node.codeHookParams || [];
  const beliefTag = String(params[0] || "");
  const scaleType = String(params[1] || "");
  const prompt = String(params[2] || "");

  useEffect(() => {
    async function fetchBeliefs() {
      const response = await fetch("/api/turso/getAllBeliefNodes", { method: "POST" });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success) setBeliefs(result.data);
    }
    fetchBeliefs();
  }, []);

  const handleBeliefChange = (selectedTag: string) => {
    const selectedBelief = beliefs.find(b => b.slug === selectedTag);
    if (selectedBelief) {
      onUpdate([selectedTag, selectedBelief.scale || '', String(prompt)]);
    } else {
      onUpdate([selectedTag, '', String(prompt)]);
    }
  };

  if (isCreatingBelief || editingBeliefId) {
    const belief: BeliefNode = isCreatingBelief
      ? { id: ulid(), nodeType: "Belief", parentId: null, title: "", slug: "", scale: "" }
      : beliefs.find((b) => b.id === editingBeliefId) || 
        { id: "", nodeType: "Belief", parentId: null, title: "", slug: "", scale: "" };

    return (
      <div className="my-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{isCreatingBelief ? "Create New Belief" : "Edit Belief"}</h3>
          <button onClick={() => { setIsCreatingBelief(false); setEditingBeliefId(null); }}
            className="text-cyan-700 hover:text-black">← Back</button>
        </div>
        <BeliefEditor
          belief={belief}
          create={isCreatingBelief}
          isEmbedded={true}
          onComplete={() => { setIsCreatingBelief(false); setEditingBeliefId(null); }}
          onCancel={() => { setIsCreatingBelief(false); setEditingBeliefId(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={beliefTag}
          onChange={(e) => handleBeliefChange(e.target.value)}
          className="flex-1 rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
          disabled={!!beliefTag}
        >
          <option value="">Select a belief</option>
          {beliefs.map((b) => (
            <option key={b.slug} value={b.slug}>{b.title}</option>
          ))}
        </select>
        {beliefTag ? (
          <button onClick={() => {
            const belief = beliefs.find(b => b.slug === beliefTag);
            if (belief) setEditingBeliefId(belief.id);
          }} className="text-cyan-700 hover:text-black">
            <BeakerIcon className="h-5 w-5" />
          </button>
        ) : (
          <button onClick={() => setIsCreatingBelief(true)}
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800">
            Create New Belief
          </button>
        )}
      </div>

      {beliefTag && (
        <>
          <div className="space-y-1">
            <label className="block text-sm text-gray-600">Scale Type</label>
            <select
              value={scaleType}
              className="w-full rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 bg-gray-100"
              disabled={true}
            >
              <option value="yn">Yes/No</option>
              <option value="likert">Likert Scale</option>
              <option value="10pt">10-point Scale</option>
            </select>
          </div>

          <SingleParam
            label="Question Prompt"
            value={String(prompt)}
            onChange={(value: string) => onUpdate([beliefTag, scaleType, value])}
          />
        </>
      )}
    </div>
  );
}
