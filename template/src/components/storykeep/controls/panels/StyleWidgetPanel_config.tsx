import { useState, useEffect, useCallback } from "react";
import { ulid } from "ulid";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import BeliefEditor from "../manage/BeliefEditor";
import type { FlatNode, BeliefNode } from "@/types.ts";
import { widgetMeta } from "@/constants.ts";
import { settingsPanelStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import { isWidgetNode } from "@/utils/nodes/type-guards.tsx";

interface StyleWidgetConfigPanelProps {
  node: FlatNode;
}

const createUpdatedWidget = (
  widgetNode: FlatNode,
  newCopy: string,
  newParams: (string | string[])[]
) => {
  return {
    id: widgetNode.id,
    parentId: widgetNode.parentId,
    nodeType: widgetNode.nodeType,
    tagName: "code" as const,
    copy: newCopy,
    codeHookParams: newParams,
    isChanged: true,
  };
};

const StyleWidgetConfigPanel = ({ node }: StyleWidgetConfigPanelProps) => {
  if (!isWidgetNode(node)) return null;

  const widgetId = node.copy && node.copy.substring(0, node.copy.indexOf("("));
  const meta = widgetId && widgetMeta[widgetId];

  if (!meta) return null;

  const [values, setValues] = useState(() => {
    const initialValues: { [key: string]: string | string[] } = {};
    meta.valueLabels.forEach((label, index) => {
      if (meta.multi[index]) {
        initialValues[label] = Array.isArray(node.codeHookParams[index])
          ? node.codeHookParams[index]
          : [node.codeHookParams[index] || meta.valueDefaults[index]];
      } else {
        initialValues[label] = node.codeHookParams[index] || meta.valueDefaults[index];
      }
    });
    return initialValues;
  });

  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  const [availableBeliefs, setAvailableBeliefs] = useState<BeliefNode[]>([]);

  const fetchBeliefs = useCallback(async () => {
    try {
      const response = await fetch("/api/turso/getAllBeliefNodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch beliefs");

      const result = await response.json();
      if (result.success) {
        setAvailableBeliefs(result.data);
      }
    } catch (error) {
      console.error("Error fetching beliefs:", error);
    }
  }, []);

  // Fetch available beliefs
  useEffect(() => {
    if (meta.isBelief) {
      fetchBeliefs();
    }
  }, [meta.isBelief, fetchBeliefs]);

  const updateStore = useCallback(
    (newValues: typeof values) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const widgetNode = allNodes.get(node.id);
      if (!widgetNode || !isWidgetNode(widgetNode) || !widgetId) return;

      const newParams = meta.valueLabels.map((label) => newValues[label]);
      const paramStrings = meta.valueLabels.map((label) => {
        const value = newValues[label];
        return Array.isArray(value) ? value.join(",") : value;
      });
      const newCopy = `${widgetId}(${paramStrings.join("|")})`;

      ctx.modifyNodes([createUpdatedWidget(widgetNode, newCopy, newParams)]);
    },
    [node.id, widgetId, meta.valueLabels]
  );

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-widget",
      expanded: true,
    });
  };

  const handleCreateBelief = () => {
    setIsCreatingBelief(true);
  };

  // Render BeliefEditor for creating/editing beliefs
  if (isCreatingBelief || editingBeliefId) {
    const belief: BeliefNode = isCreatingBelief
      ? {
          id: ulid(),
          nodeType: "Belief",
          parentId: null,
          title: "",
          slug: "",
          scale: "",
        }
      : availableBeliefs.find((b) => b.id === editingBeliefId) || {
          id: "",
          nodeType: "Belief",
          parentId: null,
          title: "",
          slug: "",
          scale: "",
        };

    if (!isCreatingBelief && !belief) return null;

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
            ← Back to Widget Config
          </button>
        </div>
        <BeliefEditor
          belief={belief}
          create={isCreatingBelief}
          isEmbedded={true}
          onComplete={() => {
            setIsCreatingBelief(false);
            setEditingBeliefId(null);
            fetchBeliefs();
          }}
          onCancel={() => {
            setIsCreatingBelief(false);
            setEditingBeliefId(null);
          }}
        />
      </div>
    );
  }

  // Helper function to determine if the select should be disabled
  const isSelectDisabled = (beliefTag: string) => {
    const selectedBelief = availableBeliefs.find((b) => b.slug === beliefTag);
    return selectedBelief?.scale === "custom";
  };

  // Main widget configuration panel
  return (
    <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
      <div className="space-y-4 max-w-md min-w-80">
        <div className="flex flex-row flex-nowrap justify-between">
          <h2 className="text-xl font-bold">{meta.title}</h2>
          <button
            className="text-cyan-700 hover:text-black"
            title="Return to preview pane"
            onClick={handleCloseConfig}
          >
            Go Back
          </button>
        </div>

        {meta.valueLabels.map((label, index) => (
          <div key={label} className="space-y-1">
            <label className="block text-sm text-gray-600">{label}</label>
            {meta.multi[index] ? (
              <div className="space-y-1">
                {(values[label] as string[]).map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center space-x-2">
                    {meta.isBelief &&
                    label === "Belief Matching Value(s)" &&
                    isSelectDisabled(values["Belief Tag"] as string) ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="rounded-md border-0 px-2.5 py-1.5 text-gray-500 bg-gray-100 ring-1 ring-inset ring-gray-300 flex-1">
                          {value}
                        </div>
                        <button
                          onClick={() => {
                            const belief = availableBeliefs.find(
                              (b) => b.slug === values["Belief Tag"]
                            );
                            if (belief) {
                              setEditingBeliefId(belief.id);
                            }
                          }}
                          className="text-cyan-700 hover:text-black"
                          title="Edit custom values"
                        >
                          <BeakerIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : meta.isBelief && label === "Belief Tag" ? (
                      <select
                        value={value}
                        onChange={(e) => {
                          const newArray = [...(values[label] as string[])];
                          newArray[valueIndex] = e.target.value;
                          const newValues = { ...values, [label]: newArray };
                          setValues(newValues);
                          updateStore(newValues);
                        }}
                        className="rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700 flex-1"
                      >
                        <option value="">Select a belief</option>
                        {availableBeliefs.map((belief) => (
                          <option key={belief.slug} value={belief.slug}>
                            {belief.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        contentEditable
                        onBlur={(e) => {
                          const newArray = [...(values[label] as string[])];
                          newArray[valueIndex] = e.currentTarget.textContent || "";
                          const newValues = { ...values, [label]: newArray };
                          setValues(newValues);
                          updateStore(newValues);
                        }}
                        className="rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700 flex-1"
                        style={{ minHeight: "1em" }}
                        suppressContentEditableWarning
                      >
                        {value}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const newArray = (values[label] as string[]).filter(
                          (_, i) => i !== valueIndex
                        );
                        const newValues = { ...values, [label]: newArray };
                        setValues(newValues);
                        updateStore(newValues);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      title="Remove value"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newArray = [...(values[label] as string[]), ""];
                    const newValues = { ...values, [label]: newArray };
                    setValues(newValues);
                    updateStore(newValues);
                  }}
                  className="text-cyan-700 hover:text-black flex items-center"
                  title={`Add ${label}`}
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  <span>Add {label}</span>
                </button>
              </div>
            ) : meta.isScale[index] ? (
              <div className="flex items-center gap-2">
                <select
                  value={values[label] as string}
                  onChange={(e) => {
                    const newValues = { ...values, [label]: e.target.value };
                    setValues(newValues);
                    updateStore(newValues);
                  }}
                  disabled={isSelectDisabled(values["Belief Tag"] as string)}
                  className="rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700 w-full disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="yn">Yes/No</option>
                  <option value="likert">Likert Scale</option>
                  <option value="10pt">10-point Scale</option>
                  {values["Belief Tag"] && isSelectDisabled(values["Belief Tag"] as string) && (
                    <option value="custom">Custom Scale</option>
                  )}
                </select>
                {values["Belief Tag"] && isSelectDisabled(values["Belief Tag"] as string) && (
                  <button
                    onClick={() => {
                      const belief = availableBeliefs.find((b) => b.slug === values["Belief Tag"]);
                      if (belief) {
                        setEditingBeliefId(belief.id);
                      }
                    }}
                    className="text-cyan-700 hover:text-black"
                    title="Edit custom scale values"
                  >
                    <BeakerIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : meta.isBelief && label === "Belief Tag" ? (
              <div className="flex items-center gap-2">
                <select
                  value={values[label] as string}
                  onChange={(e) => {
                    const newValues = { ...values, [label]: e.target.value };
                    setValues(newValues);
                    updateStore(newValues);
                  }}
                  className="rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700 flex-1"
                >
                  <option value="">Select a belief</option>
                  {availableBeliefs.map((belief) => (
                    <option key={belief.slug} value={belief.slug}>
                      {belief.title}
                    </option>
                  ))}
                </select>
                {values[label] && (
                  <button
                    onClick={() => {
                      const belief = availableBeliefs.find((b) => b.slug === values[label]);
                      if (belief) {
                        setEditingBeliefId(belief.id);
                      }
                    }}
                    className="text-cyan-700 hover:text-black"
                    title="Edit belief"
                  >
                    <BeakerIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <div
                contentEditable
                onBlur={(e) => {
                  const newValues = {
                    ...values,
                    [label]: e.currentTarget.textContent || "",
                  };
                  setValues(newValues);
                  updateStore(newValues);
                }}
                className="rounded-md border-0 px-2.5 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cyan-700"
                style={{ minHeight: "1em" }}
                suppressContentEditableWarning
              >
                {values[label]}
              </div>
            )}
          </div>
        ))}

        {meta.isBelief && (
          <div className="mt-6">
            <button
              onClick={handleCreateBelief}
              className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800"
            >
              Create New Belief
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleWidgetConfigPanel;
