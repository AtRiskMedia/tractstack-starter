import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { GOTO_TARGETS } from "@/constants";
import ActionBuilderSlugSelector from "./ActionBuilderSlugSelector";
import ActionBuilderTimeSelector from "./ActionBuilderTimeSelector.tsx";
import type { FullContentMap } from "@/types";

interface ActionBuilderFieldProps {
  value: string;
  onChange: (value: string) => void;
  contentMap: FullContentMap[];
  slug?: string;
}

const ActionBuilderField = ({ value, onChange, contentMap, slug }: ActionBuilderFieldProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [selectedSubcommand, setSelectedSubcommand] = useState<string>("");
  const [param1, setParam1] = useState<string>("");
  const [param2, setParam2] = useState<string>("");
  const [targetQuery, setTargetQuery] = useState("");
  const [subcommandQuery, setSubcommandQuery] = useState("");
  const [param1Query, setParam1Query] = useState("");
  const [param2Query, setParam2Query] = useState("");

  useEffect(() => {
    if (value) {
      try {
        const match = value.match(/\(goto\s+\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(" ").filter(Boolean);
          if (parts.length > 0) {
            setSelectedTarget(parts[0]);
            if (GOTO_TARGETS[parts[0]]?.subcommands) {
              if (parts.length > 1) setSelectedSubcommand(parts[1]);
            } else {
              if (parts.length > 1) setParam1(parts[1]);
              if (parts.length > 2) setParam2(parts[2]);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing action value:", e);
      }
    }
  }, [value]);

  const updateValue = (target: string, sub: string = "", p1: string = "", p2: string = "") => {
    let newValue = `(goto (${target}`;
    if (GOTO_TARGETS[target]?.subcommands) {
      if (sub) newValue += ` ${sub}`;
    } else {
      if (p1) newValue += ` ${p1}`;
      if (p2) newValue += ` ${p2}`;
    }
    newValue += "))";
    onChange(newValue);
  };

  // Render parameter input based on target type
  const renderParamInput = (type: "param1" | "param2") => {
    const isParam1 = type === "param1";
    const value = isParam1 ? param1 : param2;
    const query = isParam1 ? param1Query : param2Query;
    const setQuery = isParam1 ? setParam1Query : setParam2Query;

    switch (selectedTarget) {
      case "context":
        return (
          isParam1 && (
            <ActionBuilderSlugSelector
              type="context"
              value={value}
              onSelect={(newValue) => {
                setParam1(newValue);
                updateValue(selectedTarget, "", newValue, param2);
              }}
              query={query}
              setQuery={setQuery}
              label="Select Context Pane"
              placeholder="Search context panes..."
              contentMap={contentMap}
            />
          )
        );

      case "storyFragment":
        return (
          isParam1 && (
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={value}
              onSelect={(newValue) => {
                setParam1(newValue);
                updateValue(selectedTarget, "", newValue);
              }}
              query={query}
              setQuery={setQuery}
              label="Select Story Fragment"
              placeholder="Search story fragments..."
              contentMap={contentMap}
            />
          )
        );

      case "storyFragmentPane":
        if (isParam1) {
          return (
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={value}
              onSelect={(newValue) => {
                setParam1(newValue);
                setParam2(""); // Reset pane selection when story fragment changes
                updateValue(selectedTarget, "", newValue, "");
              }}
              query={query}
              setQuery={setQuery}
              label="Select Story Fragment"
              placeholder="Search story fragments..."
              contentMap={contentMap}
            />
          );
        }
        return (
          !isParam1 &&
          param1 && (
            <ActionBuilderSlugSelector
              type="pane"
              value={value}
              onSelect={(newValue) => {
                setParam2(newValue);
                updateValue(selectedTarget, "", param1, newValue);
              }}
              query={query}
              setQuery={setQuery}
              label="Select Pane"
              placeholder="Search panes..."
              contentMap={contentMap}
              parentSlug={param1}
            />
          )
        );

      case "url":
        return (
          isParam1 && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">External URL</label>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setParam1(newValue);
                  updateValue(selectedTarget, "", newValue);
                }}
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
              />
            </div>
          )
        );

      case "bunny":
        if (isParam1 && slug) {
          if (!value) setParam1(slug);
          return (
            <ActionBuilderSlugSelector
              type="storyFragment"
              value={value || slug}
              onSelect={(newValue) => {
                setParam1(newValue);
                setParam2(""); // Reset time selection when story fragment changes
                updateValue(selectedTarget, "", newValue, "");
              }}
              query={query}
              setQuery={setQuery}
              label="Select Story Fragment"
              placeholder="Search story fragments..."
              contentMap={contentMap}
            />
          );
        }
        return (
          !isParam1 && (
            <ActionBuilderTimeSelector
              value={value}
              onSelect={(newValue) => {
                setParam2(newValue);
                updateValue(selectedTarget, "", param1, newValue);
              }}
              label="Select Start Time"
            />
          )
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Navigation Target</label>
        <Combobox
          value={selectedTarget}
          onChange={(target) => {
            setSelectedTarget(target);
            setSelectedSubcommand("");
            setParam1("");
            setParam2("");
            updateValue(target);
          }}
        >
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
              onChange={(e) => setTargetQuery(e.target.value)}
              displayValue={(key: string) => GOTO_TARGETS[key]?.name || ""}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
          </div>

          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {Object.entries(GOTO_TARGETS)
              .filter(
                ([key, data]) =>
                  data.name.toLowerCase().includes(targetQuery.toLowerCase()) ||
                  key.toLowerCase().includes(targetQuery.toLowerCase())
              )
              .map(([key, data]) => (
                <Combobox.Option
                  key={key}
                  value={key}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-myorange text-white" : "text-gray-900"
                    }`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                        {data.name}
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
              ))}
          </Combobox.Options>
        </Combobox>

        {GOTO_TARGETS[selectedTarget] && (
          <p className="mt-1 text-sm text-gray-500">{GOTO_TARGETS[selectedTarget].description}</p>
        )}
      </div>

      {selectedTarget && GOTO_TARGETS[selectedTarget]?.subcommands && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Section</label>
          <Combobox
            value={selectedSubcommand}
            onChange={(sub) => {
              setSelectedSubcommand(sub);
              updateValue(selectedTarget, sub);
            }}
          >
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
                onChange={(e) => setSubcommandQuery(e.target.value)}
                displayValue={(val: string) => val}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </Combobox.Button>
            </div>

            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {GOTO_TARGETS[selectedTarget]
                .subcommands!.filter((cmd) =>
                  cmd.toLowerCase().includes(subcommandQuery.toLowerCase())
                )
                .map((cmd) => (
                  <Combobox.Option
                    key={cmd}
                    value={cmd}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-myorange text-white" : "text-gray-900"
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                        >
                          {cmd}
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
                ))}
            </Combobox.Options>
          </Combobox>
        </div>
      )}

      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresParam &&
        !GOTO_TARGETS[selectedTarget].subcommands &&
        renderParamInput("param1")}

      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresSecondParam &&
        param1 &&
        renderParamInput("param2")}
    </div>
  );
};

export default ActionBuilderField;
