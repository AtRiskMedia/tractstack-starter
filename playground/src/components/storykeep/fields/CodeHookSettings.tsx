import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { Switch } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import { paneCodeHook } from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep/StoryKeep_utils";
import ContentEditableField from "./ContentEditableField";
import type { CodeHookDatum } from "../../../types";

interface CodeHookProps {
  id: string;
}

const CodeHookSettings = ({ id }: CodeHookProps) => {
  const $paneCodeHook = useStore(paneCodeHook, { keys: [id] });
  const { updateStoreField, handleUndo } = useStoryKeepUtils(id);

  const [localCodeHook, setLocalCodeHook] = useState<CodeHookDatum>({
    target: "",
    options: "{}",
  });
  const optionKeysRef = useRef<{ [oldKey: string]: string }>({});

  useEffect(() => {
    setLocalCodeHook($paneCodeHook[id]?.current || { target: "", options: "{}" });
  }, [$paneCodeHook[id]?.current]);

  const handleTargetChange = useCallback((newTarget: string) => {
    setLocalCodeHook((prev) => ({ ...prev, target: newTarget }));
    return true;
  }, []);

  const handleTargetEditingChange = useCallback(
    (editing: boolean) => {
      if (!editing) {
        updateStoreField("paneCodeHook", localCodeHook);
      }
    },
    [updateStoreField, localCodeHook]
  );

  const handleOptionChange = useCallback(
    (oldKey: string, field: "key" | "value", newValue: string) => {
      setLocalCodeHook((prev) => {
        const options = JSON.parse(prev.options || "{}");
        if (field === "key") {
          if (newValue.trim() !== "") {
            optionKeysRef.current[oldKey] = newValue;
          }
        } else {
          options[oldKey] = newValue;
        }
        return {
          ...prev,
          options: JSON.stringify(options),
        };
      });
      return true;
    },
    []
  );

  const handleOptionEditingChange = useCallback(
    (editing: boolean, key: string) => {
      if (!editing) {
        setLocalCodeHook((prev) => {
          const options = JSON.parse(prev.options || "{}");
          const newKey = optionKeysRef.current[key] || key;
          if (newKey !== key) {
            if (newKey in options) {
              delete optionKeysRef.current[key];
              return prev;
            }
            const oldKey = Object.keys(options).find((k) => k.toLowerCase() === key.toLowerCase());
            if (oldKey) {
              const value = options[oldKey];
              delete options[oldKey];
              options[newKey] = value;
            }
          }
          optionKeysRef.current = {};
          const updatedCodeHook = {
            ...prev,
            options: JSON.stringify(options),
          };
          updateStoreField("paneCodeHook", updatedCodeHook);
          return updatedCodeHook;
        });
      }
    },
    [updateStoreField]
  );

  const addOption = useCallback(() => {
    setLocalCodeHook((prev) => {
      const options = JSON.parse(prev.options || "{}");
      const newKey = `newOption${Object.keys(options).length + 1}`;
      options[newKey] = "";
      return {
        ...prev,
        options: JSON.stringify(options),
      };
    });
  }, []);

  const removeOption = useCallback((key: string) => {
    setLocalCodeHook((prev) => {
      const options = JSON.parse(prev.options || "{}");
      delete options[key];
      return {
        ...prev,
        options: JSON.stringify(options),
      };
    });
  }, []);

  const toggleBooleanOption = useCallback((key: string) => {
    setLocalCodeHook((prev) => {
      const options = JSON.parse(prev.options || "{}");
      options[key] = options[key] === "true" ? "false" : "true";
      return {
        ...prev,
        options: JSON.stringify(options),
      };
    });
  }, []);

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="code-hook-target" className="block text-sm text-mydarkgrey">
          Target
        </label>
        <ContentEditableField
          id="code-hook-target"
          value={localCodeHook.target}
          onChange={handleTargetChange}
          onEditingChange={handleTargetEditingChange}
          placeholder="Enter target"
          className={commonInputClass}
          mode="codehook"
        />
      </div>

      <div>
        <label className="block text-sm text-mydarkgrey">Options</label>
        {Object.entries(JSON.parse(localCodeHook.options || "{}")).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 mt-2">
            <ContentEditableField
              id={`option-key-${key}`}
              value={optionKeysRef.current[key] || key}
              onChange={(newKey) => handleOptionChange(key, "key", newKey)}
              onEditingChange={(editing) => handleOptionEditingChange(editing, key)}
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
              <ContentEditableField
                id={`option-value-${key}`}
                value={value as string}
                onChange={(newValue) => handleOptionChange(key, "value", newValue)}
                onEditingChange={(editing) => handleOptionEditingChange(editing, key)}
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

      <div className="flex justify-end">
        <button
          onClick={() => handleUndo("paneCodeHook", id)}
          className="flex items-center text-myblack bg-mygreen/50 px-2 py-1 rounded hover:bg-myorange hover:text-white"
          disabled={$paneCodeHook[id]?.history.length === 0}
        >
          <ChevronDoubleLeftIcon className="h-5 w-5 mr-1" />
          Undo
        </button>
      </div>
    </div>
  );
};

export default CodeHookSettings;
