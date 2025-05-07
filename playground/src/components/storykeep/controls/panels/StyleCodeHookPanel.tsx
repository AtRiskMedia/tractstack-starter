import { useState, useCallback, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import { Switch } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { isPaneNode } from "@/utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";
import type { PaneNode } from "@/types";

interface ExtendedBasePanelProps extends BasePanelProps {
  availableCodeHooks?: string[];
}

interface OptionState {
  key: string;
  value: string;
  isDirty: boolean;
}

const StyleCodeHookPanel = ({ node, availableCodeHooks = [] }: ExtendedBasePanelProps) => {
  if (!node || !isPaneNode(node)) return null;

  const [localTarget, setLocalTarget] = useState(node.codeHookTarget || "");
  const [query, setQuery] = useState("");

  // Parse the nested options from JSON string
  const [localOptions, setLocalOptions] = useState<OptionState[]>(() => {
    try {
      const payload = node.codeHookPayload || {};
      const optionsStr = payload.options || "{}";
      const parsedOptions = JSON.parse(optionsStr);
      return Object.entries(parsedOptions).map(([key, value]) => ({
        key,
        value: String(value),
        isDirty: false,
      }));
    } catch (error) {
      console.error("Error parsing options:", error);
      return [];
    }
  });

  // Debounced update to store
  const updateStore = useCallback(
    (target: string, options: Record<string, string>) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const paneNode = cloneDeep(allNodes.get(node.id)) as PaneNode;
      if (!paneNode) return;

      const updatedNode = {
        ...paneNode,
        codeHookTarget: target,
        codeHookPayload: {
          options: JSON.stringify(options),
        },
        isChanged: true,
      };
      ctx.modifyNodes([updatedNode]);
    },
    [node]
  );

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
  }, []);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredCodeHooks =
      query === ""
        ? availableCodeHooks
        : availableCodeHooks.filter((hook) => hook.toLowerCase().includes(query.toLowerCase()));

    return createListCollection({
      items: filteredCodeHooks,
    });
  }, [availableCodeHooks, query]);

  const handleOptionKeyChange = useCallback((index: number, newKey: string) => {
    setLocalOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? { ...opt, key: newKey, isDirty: true } : opt))
    );
  }, []);

  const handleOptionKeyBlur = useCallback(
    (index: number) => {
      if (!isInitialized) return;

      setLocalOptions((prev) => {
        const updated = prev.map((opt, idx) => (idx === index ? { ...opt, isDirty: false } : opt));
        const payload = updated.reduce(
          (acc, { key, value }) => {
            if (key.trim()) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

        updateStore(localTarget, payload);
        return updated;
      });
    },
    [isInitialized, localTarget, updateStore]
  );

  const handleOptionValueChange = useCallback(
    (index: number, newValue: string) => {
      if (!isInitialized) return;
      setLocalOptions((prev) =>
        prev.map((opt, idx) => (idx === index ? { ...opt, value: newValue, isDirty: true } : opt))
      );
    },
    [isInitialized]
  );

  const handleOptionValueBlur = useCallback(
    (index: number) => {
      if (!isInitialized) return;

      setLocalOptions((prev) => {
        const updated = prev.map((opt, idx) => (idx === index ? { ...opt, isDirty: false } : opt));
        const payload = updated.reduce(
          (acc, { key, value }) => {
            if (key.trim()) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

        updateStore(localTarget, payload);
        return updated;
      });
    },
    [isInitialized, localTarget, updateStore]
  );

  const toggleBooleanOption = useCallback(
    (index: number) => {
      if (!isInitialized) return;

      setLocalOptions((prev) => {
        const updated = prev.map((opt, idx) =>
          idx === index ? { ...opt, value: opt.value === "true" ? "false" : "true" } : opt
        );
        const payload = updated.reduce(
          (acc, { key, value }) => {
            if (key.trim()) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

        updateStore(localTarget, payload);
        return updated;
      });
    },
    [isInitialized, localTarget, updateStore]
  );

  const addOption = useCallback(() => {
    setLocalOptions((prev) => [
      ...prev,
      { key: `newOption${prev.length + 1}`, value: "", isDirty: false },
    ]);
  }, []);

  const removeOption = useCallback(
    (index: number) => {
      if (!isInitialized) return;

      setLocalOptions((prev) => {
        const updated = prev.filter((_, idx) => idx !== index);
        const payload = updated.reduce(
          (acc, { key, value }) => {
            if (key.trim()) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>
        );

        updateStore(localTarget, payload);
        return updated;
      });
    },
    [isInitialized, localTarget, updateStore]
  );

  const isValidCodeHook = availableCodeHooks.includes(localTarget);

  const handleTargetChange = useCallback(
    (details: { value: string[] }) => {
      if (!isInitialized) return;
      const target = details.value[0] || "";
      setLocalTarget(target);

      const payload = localOptions.reduce(
        (acc, { key, value }) => {
          if (key.trim()) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      updateStore(target, payload);
    },
    [isInitialized, localOptions, updateStore]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-break",
      expanded: true,
    });
  };

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6";

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .codehook-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .codehook-item[data-highlighted] .codehook-indicator {
      color: white;
    }
    .codehook-item[data-state="checked"] .codehook-indicator {
      display: flex;
    }
    .codehook-item .codehook-indicator {
      display: none;
    }
    .codehook-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4">
      <style>{comboboxItemStyles}</style>

      {/* Header section */}
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
        {/* Target ComboBox */}
        <div className="max-w-md">
          <label className="block text-sm text-mydarkgrey">Target</label>
          <div className="relative mt-1">
            <Combobox.Root
              collection={collection}
              value={localTarget ? [localTarget] : []}
              onValueChange={handleTargetChange}
              onInputValueChange={(details) => setQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <Combobox.Input className={commonInputClass} placeholder="Select a code hook..." />
                <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Trigger>
              </div>

              <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {collection.items.length === 0 ? (
                  <div className="relative cursor-default select-none px-4 py-2 text-mydarkgrey">
                    Nothing found.
                  </div>
                ) : (
                  collection.items.map((hook) => (
                    <Combobox.Item
                      key={hook}
                      item={hook}
                      className="codehook-item relative cursor-default select-none py-2 pl-10 pr-4"
                    >
                      <span className="block truncate">{hook}</span>
                      <span className="codehook-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </Combobox.Item>
                  ))
                )}
              </Combobox.Content>
            </Combobox.Root>
          </div>
          {!isValidCodeHook && localTarget && (
            <div className="mt-2 flex items-center text-amber-500">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm">Warning: Selected code hook is not available</span>
            </div>
          )}
        </div>

        {/* Options section */}
        <div>
          <label className="block text-sm text-mydarkgrey">Options</label>
          {localOptions.map((option, index) => (
            <div key={index} className="flex items-center space-x-2 mt-2">
              <input
                type="text"
                value={option.key}
                onChange={(e) => handleOptionKeyChange(index, e.target.value)}
                onBlur={() => handleOptionKeyBlur(index)}
                placeholder="Key"
                className={`w-1/3 ${commonInputClass}`}
              />
              {option.value === "true" || option.value === "false" ? (
                <Switch
                  checked={option.value === "true"}
                  onChange={() => toggleBooleanOption(index)}
                  className={`${
                    option.value === "true" ? "bg-cyan-600" : "bg-mydarkgrey"
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      option.value === "true" ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              ) : (
                <input
                  type="text"
                  value={option.value}
                  onChange={(e) => handleOptionValueChange(index, e.target.value)}
                  onBlur={() => handleOptionValueBlur(index)}
                  placeholder="Value"
                  className={`w-1/2 ${commonInputClass}`}
                />
              )}
              <button
                onClick={() => removeOption(index)}
                className="text-cyan-600 hover:text-black"
                title="Remove option"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="mt-2 flex items-center text-myblue hover:text-cyan-600"
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
