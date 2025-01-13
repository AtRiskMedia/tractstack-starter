import { useState, useCallback, useEffect } from "react";
import { type Dispatch, type SetStateAction } from "react";
import { getCtx } from "@/store/nodes.ts";
import { PaneMode } from "./ConfigPanePanel";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import type { PaneNode, BeliefDatum } from "@/types";
import { cloneDeep } from "@/utils/common/helpers.ts";

interface PaneMagicPathPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const PaneMagicPathPanel = ({ nodeId, setMode }: PaneMagicPathPanelProps) => {
  // Local state for form management
  const [heldPaths, setHeldPaths] = useState<BeliefDatum>({});
  const [withheldPaths, setWithheldPaths] = useState<BeliefDatum>({});
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  // Initialize state from node data
  useEffect(() => {
    setHeldPaths(paneNode.heldBeliefs || {});
    setWithheldPaths(paneNode.withheldBeliefs || {});
  }, [paneNode.heldBeliefs, paneNode.withheldBeliefs]);

  const updateStore = useCallback(
    (isHeld: boolean, newPaths: BeliefDatum) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const updatedNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;

      if (isHeld) {
        updatedNode.heldBeliefs = newPaths;
      } else {
        updatedNode.withheldBeliefs = newPaths;
      }
      updatedNode.isChanged = true;

      const newNodes = new Map(allNodes);
      newNodes.set(nodeId, updatedNode);
      ctx.allNodes.set(newNodes);
      ctx.notifyNode(nodeId);
    },
    [nodeId]
  );

  const addPath = (isHeld: boolean) => {
    const paths = isHeld ? heldPaths : withheldPaths;
    const newKey = `newPath${Object.keys(paths).length + 1}`;
    const updatedPaths = {
      ...paths,
      [newKey]: [""],
    };

    if (isHeld) {
      setHeldPaths(updatedPaths);
    } else {
      setWithheldPaths(updatedPaths);
    }
    updateStore(isHeld, updatedPaths);
  };

  const handleEditingChange = useCallback(
    (isHeld: boolean, key: string, valueIndex: number | null, editing: boolean) => {
      if (!editing) {
        const paths = isHeld ? heldPaths : withheldPaths;
        const updatedPaths = { ...paths };

        const editKey = valueIndex !== null ? `${key}-${valueIndex}-value` : `${key}-key`;
        const newValue = editingValues[editKey];

        if (valueIndex !== null) {
          if (Array.isArray(updatedPaths[key])) {
            updatedPaths[key] = [...updatedPaths[key]];
            updatedPaths[key][valueIndex] = newValue?.trim().toUpperCase() || "";
          }
        } else if (newValue) {
          const oldKey = Object.keys(paths).find((k) => k.toLowerCase() === key.toLowerCase());
          if (oldKey && oldKey !== newValue) {
            const values = updatedPaths[oldKey];
            delete updatedPaths[oldKey];
            updatedPaths[newValue] = values;
          }
        }

        if (isHeld) {
          setHeldPaths(updatedPaths);
        } else {
          setWithheldPaths(updatedPaths);
        }
        updateStore(isHeld, updatedPaths);

        setEditingValues((prev) => {
          const next = { ...prev };
          delete next[editKey];
          return next;
        });
      }
    },
    [heldPaths, withheldPaths, editingValues, updateStore]
  );

  const addPathValue = useCallback(
    (isHeld: boolean, key: string) => {
      const paths = isHeld ? heldPaths : withheldPaths;
      const values = paths[key];
      if (Array.isArray(values)) {
        const updatedValues = [...values, ""];
        const updatedPaths = { ...paths, [key]: updatedValues };
        if (isHeld) {
          setHeldPaths(updatedPaths);
        } else {
          setWithheldPaths(updatedPaths);
        }
        updateStore(isHeld, updatedPaths);
      }
    },
    [heldPaths, withheldPaths, updateStore]
  );

  const removePathValue = useCallback(
    (isHeld: boolean, key: string, valueIndex: number) => {
      const paths = isHeld ? heldPaths : withheldPaths;
      const values = paths[key];
      if (Array.isArray(values)) {
        const updatedValues = values.filter((_, index) => index !== valueIndex);
        let updatedPaths: BeliefDatum;
        if (updatedValues.length === 0) {
          updatedPaths = Object.fromEntries(Object.entries(paths).filter(([k]) => k !== key));
        } else {
          updatedPaths = { ...paths, [key]: updatedValues };
        }
        if (isHeld) {
          setHeldPaths(updatedPaths);
        } else {
          setWithheldPaths(updatedPaths);
        }
        updateStore(isHeld, updatedPaths);
      }
    },
    [heldPaths, withheldPaths, updateStore]
  );

  const renderPathForm = (isHeld: boolean) => {
    const paths = isHeld ? heldPaths : withheldPaths;

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

        {Object.entries(paths).map(([key, values]) => (
          <div key={key} className="mb-2 p-2 border border-mylightgrey rounded-md">
            <div className="flex gap-2 mb-1">
              <div className="flex-1">
                <label className="text-sm text-mydarkgrey">Belief Slug</label>
                <div
                  contentEditable
                  onBlur={(e) => {
                    const newKey = e.currentTarget.textContent || "";
                    if (newKey && newKey !== key) {
                      const updatedPaths = { ...paths };
                      const values = updatedPaths[key];
                      delete updatedPaths[key];
                      updatedPaths[newKey] = values;
                      if (isHeld) {
                        setHeldPaths(updatedPaths);
                      } else {
                        setWithheldPaths(updatedPaths);
                      }
                      updateStore(isHeld, updatedPaths);
                    }
                  }}
                  suppressContentEditableWarning
                  className="block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm"
                >
                  {key}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm text-mydarkgrey">Value(s)</label>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(values) &&
                    values.map((value, valueIndex) => (
                      <div key={valueIndex} className="flex items-center">
                        <input
                          type="text"
                          value={editingValues[`${key}-${valueIndex}-value`] ?? value}
                          onChange={(e) => {
                            setEditingValues((prev) => ({
                              ...prev,
                              [`${key}-${valueIndex}-value`]: e.target.value,
                            }));
                          }}
                          onBlur={() => handleEditingChange(isHeld, key, valueIndex, false)}
                          placeholder="Value"
                          className="block rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm"
                        />
                        <div className="flex">
                          <button
                            onClick={() => removePathValue(isHeld, key, valueIndex)}
                            className="ml-1 text-myorange hover:text-black"
                            title="Remove value"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          {valueIndex === values.length - 1 && (
                            <button
                              onClick={() => addPathValue(isHeld, key)}
                              className="text-mydarkgrey hover:text-black"
                              title="Add value"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
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
            <li>Belief Slugs should be descriptive (e.g. "KeyChallenge", "Industry")</li>
            <li>Values should be uppercase and specific (e.g. "INCREASE ENGAGEMENT")</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaneMagicPathPanel;
