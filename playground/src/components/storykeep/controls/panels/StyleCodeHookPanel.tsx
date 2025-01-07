import { useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import { Switch } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { isPaneNode } from "@/utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";
import type { PaneNode } from "@/types";

interface ExtendedBasePanelProps extends BasePanelProps {
  availableCodeHooks?: string[];
}

const StyleCodeHookPanel = ({ node, availableCodeHooks = [] }: ExtendedBasePanelProps) => {
  if (!node || !isPaneNode(node)) return null;

  const [localTarget, setLocalTarget] = useState(node.codeHookTarget || "");
  const [query, setQuery] = useState("");
  const [localOptions, setLocalOptions] = useState<Record<string, string>>(
    node.codeHookPayload || {}
  );

  const filteredCodeHooks =
    query === ""
      ? availableCodeHooks
      : availableCodeHooks.filter((hook) => hook.toLowerCase().includes(query.toLowerCase()));

  const isValidCodeHook = availableCodeHooks.includes(localTarget);

  // Update node in store
  const updateNode = useCallback(
    (newTarget: string, newOptions: Record<string, string>) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const paneNode = allNodes.get(node.id) as PaneNode;

      if (!paneNode) return;

      const updatedNode = {
        ...paneNode,
        codeHookTarget: newTarget,
        codeHookPayload: newOptions,
        isChanged: true,
      };

      const newNodes = new Map(allNodes);
      newNodes.set(node.id, updatedNode);
      ctx.allNodes.set(newNodes);

      if (node.parentId) {
        ctx.notifyNode(node.parentId);
      }
    },
    [node]
  );

  const handleOptionValueChange = useCallback(
    (key: string, newValue: string) => {
      setLocalOptions((prev) => {
        const updated = { ...prev, [key]: newValue };
        updateNode(localTarget, updated);
        return updated;
      });
    },
    [localTarget, updateNode]
  );

  const handleOptionKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      if (newKey.trim() === "") return;

      setLocalOptions((prev) => {
        const updated = { ...prev };
        delete updated[oldKey];
        updated[newKey] = prev[oldKey];
        updateNode(localTarget, updated);
        return updated;
      });
    },
    [localTarget, updateNode]
  );

  const toggleBooleanOption = useCallback(
    (key: string) => {
      setLocalOptions((prev) => {
        const updated = { ...prev };
        updated[key] = updated[key] === "true" ? "false" : "true";
        updateNode(localTarget, updated);
        return updated;
      });
    },
    [localTarget, updateNode]
  );

  const addOption = useCallback(() => {
    setLocalOptions((prev) => {
      const newKey = `newOption${Object.keys(prev).length + 1}`;
      const updated = { ...prev, [newKey]: "" };
      updateNode(localTarget, updated);
      return updated;
    });
  }, [localTarget, updateNode]);

  const removeOption = useCallback(
    (key: string) => {
      setLocalOptions((prev) => {
        const updated = { ...prev };
        delete updated[key];
        updateNode(localTarget, updated);
        return updated;
      });
    },
    [localTarget, updateNode]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-break",
    });
  };

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6";

  return (
    <div className="space-y-4">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">Code Hook Settings</h2>
        <button
          className="text-myblue hover:text-black"
          title="Return to preview pane"
          onClick={handleCancel}
        >
          Go Back
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-mydarkgrey">Target</label>
          <div className="relative mt-1">
            <Combobox
              value={localTarget}
              onChange={(value) => {
                setLocalTarget(value);
                updateNode(value, localOptions);
              }}
            >
              <div className="relative">
                <Combobox.Input
                  className={commonInputClass}
                  onChange={(event) => setQuery(event.target.value)}
                  displayValue={(target: string) => target}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredCodeHooks.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none px-4 py-2 text-mydarkgrey">
                    Nothing found.
                  </div>
                ) : (
                  filteredCodeHooks.map((hook) => (
                    <Combobox.Option
                      key={hook}
                      value={hook}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? "bg-myorange text-white" : "text-myblack"
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                          >
                            {hook}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-white" : "text-myorange"
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Combobox>
          </div>
          {!isValidCodeHook && localTarget && (
            <div className="mt-2 flex items-center text-amber-500">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Warning: Selected code hook is not available</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-mydarkgrey">Options</label>
          {Object.entries(localOptions).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2 mt-2">
              <input
                type="text"
                value={key}
                onChange={(e) => handleOptionKeyChange(key, e.target.value)}
                onBlur={(e) => handleOptionKeyChange(key, e.target.value)}
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
                  onBlur={(e) => handleOptionValueChange(key, e.target.value)}
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
  );
};

export default StyleCodeHookPanel;
