import { useState, useCallback } from "react";
import { Switch } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import { PaneMode } from "./ConfigPanePanel";
import { getCtx } from "@/store/nodes.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { type PaneNode } from "@/types";
import { type Dispatch, type SetStateAction } from "react";

interface PaneCodeHookPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const PaneCodeHookPanel = ({ nodeId, setMode }: PaneCodeHookPanelProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;

  const [target, setTarget] = useState(paneNode?.codeHookTarget || "");
  const [options, setOptions] = useState<Record<string, string>>(paneNode?.codeHookPayload || {});
  const [optionKeysMap, setOptionKeysMap] = useState<Record<string, string>>({});

  const updateStore = useCallback(
    (newTarget: string, newOptions: Record<string, string>) => {
      if (!paneNode) return;

      const updatedNode = cloneDeep(paneNode);
      updatedNode.codeHookTarget = newTarget;
      updatedNode.codeHookPayload = newOptions;
      updatedNode.isChanged = true;
      ctx.modifyNodes([updatedNode]);
    },
    [paneNode, ctx]
  );

  const handleTargetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTarget(e.target.value);
  }, []);

  const handleTargetBlur = useCallback(() => {
    if (target.trim()) {
      updateStore(target, options);
    }
  }, [target, options, updateStore]);

  const handleOptionKeyChange = useCallback((oldKey: string, newKey: string) => {
    if (newKey.trim() === "") return;
    setOptionKeysMap((prev) => ({ ...prev, [oldKey]: newKey }));
  }, []);

  const handleOptionBlur = useCallback(
    (oldKey: string) => {
      const newKey = optionKeysMap[oldKey];
      if (!newKey || newKey === oldKey) return;

      // First update local state
      setOptions((prev) => {
        const newOptions = { ...prev };
        const value = prev[oldKey];
        delete newOptions[oldKey];
        newOptions[newKey] = value;
        return newOptions;
      });

      // Clean up key map
      setOptionKeysMap((prev) => {
        const newMap = { ...prev };
        delete newMap[oldKey];
        return newMap;
      });

      // Then update store if needed
      if (!newKey.startsWith("newOption") || options[oldKey]?.trim()) {
        const newOptions = { ...options };
        const value = newOptions[oldKey];
        delete newOptions[oldKey];
        newOptions[newKey] = value;
        updateStore(target, newOptions);
      }
    },
    [optionKeysMap, options, target, updateStore]
  );

  const handleOptionValueChange = useCallback((key: string, value: string) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOptionValueBlur = useCallback(
    (key: string) => {
      const currentValue = options[key]?.trim();
      if (!currentValue && key.startsWith("newOption")) {
        setOptions((prev) => {
          const newOptions = { ...prev };
          delete newOptions[key];
          return newOptions;
        });
      } else {
        updateStore(target, options);
      }
    },
    [options, target, updateStore]
  );

  const toggleBooleanOption = useCallback(
    (key: string) => {
      const newValue = options[key] === "true" ? "false" : "true";
      setOptions((prev) => ({ ...prev, [key]: newValue }));

      const newOptions = { ...options, [key]: newValue };
      updateStore(target, newOptions);
    },
    [options, target, updateStore]
  );

  const addOption = useCallback(() => {
    setOptions((prev) => {
      const newKey = `newOption${Object.keys(prev).length + 1}`;
      return { ...prev, [newKey]: "" };
    });
  }, []);

  const removeOption = useCallback(
    (key: string) => {
      // First update local state
      setOptions((prev) => {
        const newOptions = { ...prev };
        delete newOptions[key];
        return newOptions;
      });

      // Then update store if needed
      if (!key.startsWith("newOption") || options[key]?.trim()) {
        const newOptions = { ...options };
        delete newOptions[key];
        updateStore(target, newOptions);
      }
    },
    [options, target, updateStore]
  );

  if (!paneNode) return null;

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6";

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Code Hook Settings</h3>
          <button
            onClick={() => setMode(PaneMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-mydarkgrey">Target</label>
            <input
              type="text"
              value={target}
              onChange={handleTargetChange}
              onBlur={handleTargetBlur}
              placeholder="Enter target"
              className={commonInputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-mydarkgrey">Options</label>
            {Object.entries(options).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  value={optionKeysMap[key] || key}
                  onChange={(e) => handleOptionKeyChange(key, e.target.value)}
                  onBlur={() => handleOptionBlur(key)}
                  placeholder="Key"
                  className={`w-1/3 ${commonInputClass}`}
                />
                {value === "true" || value === "false" ? (
                  <Switch
                    checked={value === "true"}
                    onChange={() => toggleBooleanOption(key)}
                    className={`${
                      value === "true" ? "bg-myorange" : "bg-mydarkgrey"
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        value === "true" ? "translate-x-6" : "translate-x-1"
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleOptionValueChange(key, e.target.value)}
                    onBlur={() => handleOptionValueBlur(key)}
                    placeholder="Value"
                    className={`w-1/2 ${commonInputClass}`}
                  />
                )}
                <button
                  onClick={() => removeOption(key)}
                  className="text-myorange hover:text-black"
                  title="Remove option"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="mt-2 flex items-center text-myblue hover:text-myorange"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add Option
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaneCodeHookPanel;
