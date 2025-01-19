import { useState, useCallback, useEffect } from "react";
import { getCtx } from "@/store/nodes.ts";
import { PaneMode } from "./ConfigPanePanel";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { heldBeliefsScales } from "@/utils/common/beliefs.ts";
import { type Dispatch, type SetStateAction } from "react";
import type { PaneNode, BeliefNode } from "@/types";

interface PaneMagicPathPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

type PathsType = Record<string, string[]>;

const PaneMagicPathPanel = ({ nodeId, setMode }: PaneMagicPathPanelProps) => {
  const [heldPaths, setHeldPaths] = useState<PathsType>({});
  const [withheldPaths, setWithheldPaths] = useState<PathsType>({});
  const [availableBeliefs, setAvailableBeliefs] = useState<BeliefNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode | undefined;

  if (!paneNode) return null;

  // Fetch available beliefs
  useEffect(() => {
    const fetchBeliefs = async () => {
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchBeliefs();
  }, []);

  // Initialize state from node data
  useEffect(() => {
    setHeldPaths(paneNode.heldBeliefs as PathsType || {});
    setWithheldPaths(paneNode.withheldBeliefs as PathsType || {});
  }, [paneNode.heldBeliefs, paneNode.withheldBeliefs]);

  const updateStore = useCallback(
    (isHeld: boolean, newPaths: PathsType) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const updatedNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;

      if (isHeld) {
        updatedNode.heldBeliefs = newPaths;
      } else {
        updatedNode.withheldBeliefs = newPaths;
      }
      updatedNode.isChanged = true;
      ctx.modifyNodes([updatedNode]);
    },
    [nodeId]
  );

  const getValidValuesForBelief = (beliefSlug: string): string[] => {
    const belief = availableBeliefs.find((b) => b.slug === beliefSlug);
    if (!belief) return [];

    if (belief.scale === "custom" && belief.customValues) {
      return belief.customValues;
    }

    const scaleKey = belief.scale as keyof typeof heldBeliefsScales;
    const scale = heldBeliefsScales[scaleKey];
    return scale ? scale.map((option) => option.slug) : [];
  };

  const addPath = (isHeld: boolean): void => {
    const paths = isHeld ? heldPaths : withheldPaths;
    const updatedPaths = {
      ...paths,
      "": [""],
    };

    if (isHeld) {
      setHeldPaths(updatedPaths);
    } else {
      setWithheldPaths(updatedPaths);
    }
    updateStore(isHeld, updatedPaths);
  };

  const handleValueChange = (
    isHeld: boolean,
    beliefKey: string,
    valueIndex: number,
    newValue: string
  ): void => {
    const paths = isHeld ? heldPaths : withheldPaths;
    const values = paths[beliefKey];
    
    if (!Array.isArray(values)) return;

    const updatedPaths = { ...paths };
    updatedPaths[beliefKey] = [...values];
    updatedPaths[beliefKey][valueIndex] = newValue;

    if (isHeld) {
      setHeldPaths(updatedPaths);
    } else {
      setWithheldPaths(updatedPaths);
    }
    updateStore(isHeld, updatedPaths);
  };

  const handleRemoveValue = (isHeld: boolean, beliefKey: string, valueIndex: number): void => {
    const paths = isHeld ? heldPaths : withheldPaths;
    const values = paths[beliefKey];
    
    if (!Array.isArray(values)) return;

    const updatedPaths = { ...paths };
    updatedPaths[beliefKey] = values.filter((_, i: number) => i !== valueIndex);
    
    if (updatedPaths[beliefKey].length === 0) {
      delete updatedPaths[beliefKey];
    }

    if (isHeld) {
      setHeldPaths(updatedPaths);
    } else {
      setWithheldPaths(updatedPaths);
    }
    updateStore(isHeld, updatedPaths);
  };

  const renderPathForm = (isHeld: boolean) => {
    const paths = isHeld ? heldPaths : withheldPaths;

    if (isLoading) {
      return <div>Loading available beliefs...</div>;
    }

    return (
      <div className="mb-4 w-96">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">
            {isHeld ? "Show Content Condition(s)" : "Hide Content Condition(s)"}
          </h3>
          <button
            onClick={() => addPath(isHeld)}
            className="p-1 bg-myblue text-white rounded-md hover:bg-myblue/80"
            title={`Add ${isHeld ? "Show" : "Hide"} Condition`}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {Object.entries(paths).map(([key, values]) => {
          if (!Array.isArray(values)) return null;
          
          return (
            <div key={key} className="mb-2 p-2 border border-mylightgrey rounded-md">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-sm text-mydarkgrey">Select Belief</label>
                  <select
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const updatedPaths = { ...paths };
                      delete updatedPaths[key];
                      if (newKey) {
                        updatedPaths[newKey] = [""];
                      }
                      if (isHeld) {
                        setHeldPaths(updatedPaths);
                      } else {
                        setWithheldPaths(updatedPaths);
                      }
                      updateStore(isHeld, updatedPaths);
                    }}
                    className="block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm"
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
                    <label className="text-sm text-mydarkgrey">Select Values</label>
                    <div className="flex flex-wrap gap-1">
                      {values.map((value: string, valueIndex: number) => {
                        const validValues = getValidValuesForBelief(key);
                        return (
                          <div key={valueIndex} className="flex items-center">
                            <select
                              value={value}
                              onChange={(e) => handleValueChange(isHeld, key, valueIndex, e.target.value)}
                              className="block rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm"
                            >
                              <option value="">Select a value</option>
                              {validValues.map((val) => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>

                            <div className="flex">
                              <button
                                onClick={() => handleRemoveValue(isHeld, key, valueIndex)}
                                className="ml-1 text-myorange hover:text-black"
                                title="Remove value"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                              {valueIndex === values.length - 1 && (
                                <button
                                  onClick={() => {
                                    const updatedPaths = { ...paths };
                                    updatedPaths[key] = [...values, ""];
                                    if (isHeld) {
                                      setHeldPaths(updatedPaths);
                                    } else {
                                      setWithheldPaths(updatedPaths);
                                    }
                                    updateStore(isHeld, updatedPaths);
                                  }}
                                  className="text-mydarkgrey hover:text-black"
                                  title="Add value"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-2 text-sm">
          <a href="/storykeep/content/beliefs/create" className="text-myblue hover:text-mygreen">
            Add New Belief
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Magic Paths</h3>
          <button
            onClick={() => setMode(PaneMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="w-full flex flex-wrap gap-8">
          {renderPathForm(true)}
          {renderPathForm(false)}
        </div>

        <div className="mt-4 text-sm text-mydarkgrey">
          <p>Conditions control content visibility based on visitor beliefs:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>Show Conditions display content when matching beliefs are held</li>
            <li>Hide Conditions prevent content display when matching beliefs are held</li>
            <li>Select from existing beliefs or create new ones using the Add New Belief link</li>
            <li>Values must match the belief's defined scale</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaneMagicPathPanel;
