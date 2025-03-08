import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { GOTO_TARGETS } from "@/constants";
import type { FullContentMap } from "@/types";

interface ActionBuilderFieldProps {
  value: string;
  onChange: (value: string) => void;
  contentMap: FullContentMap[];
}

const ActionBuilderField = ({ value, onChange, contentMap }: ActionBuilderFieldProps) => {
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [selectedSubcommand, setSelectedSubcommand] = useState<string>("");
  const [param1, setParam1] = useState<string>("");
  const [param2, setParam2] = useState<string>("");
  const [targetQuery, setTargetQuery] = useState("");
  const [subcommandQuery, setSubcommandQuery] = useState("");
  const [param1Query, setParam1Query] = useState("");
  const [param2Query, setParam2Query] = useState("");

  // Filter content map based on type
  const storyFragments = contentMap.filter((item) => item.type === "StoryFragment");
  const contextPanes = contentMap.filter((item) => item.type === "Pane" && item.isContext);
  const regularPanes = contentMap.filter((item) => item.type === "Pane" && !item.isContext);

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

  const getFilteredItems = (type: string, query: string) => {
    let items: FullContentMap[] = [];
    switch (type) {
      case "storyFragment":
      case "bunny":
        items = storyFragments;
        break;
      case "context":
        items = contextPanes;
        break;
      case "pane":
        items = regularPanes;
        break;
      default:
        return [];
    }

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.slug.toLowerCase().includes(query.toLowerCase())
    );
  };

  const renderContentCombobox = (
    type: string,
    value: string,
    onSelect: (value: string) => void,
    query: string,
    setQuery: (query: string) => void
  ) => {
    const items = getFilteredItems(type, query);

    return (
      <Combobox value={value} onChange={onSelect}>
        <div className="relative">
          <Combobox.Input
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
            onChange={(e) => setQuery(e.target.value)}
            displayValue={(slug: string) => {
              const item = items.find((i) => i.slug === slug);
              return item ? `${item.title} (${item.slug})` : slug;
            }}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {items.map((item) => (
            <Combobox.Option
              key={item.id}
              value={item.slug}
              className={({ active }) =>
                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                  active ? "bg-myorange text-white" : "text-gray-900"
                }`
              }
            >
              {({ selected, active }) => (
                <>
                  <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                    {item.title}
                    <span className="ml-2 text-sm opacity-60">({item.slug})</span>
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
    );
  };

  // Render param input based on target type
  const renderParamInput = (
    paramType: string,
    paramLabel: string,
    value: string,
    onChange: (value: string) => void
  ) => {
    switch (selectedTarget) {
      case "context":
        return (
          paramType === "param1" &&
          renderContentCombobox("context", value, onChange, param1Query, setParam1Query)
        );
      case "storyFragment":
        return (
          paramType === "param1" &&
          renderContentCombobox("storyFragment", value, onChange, param1Query, setParam1Query)
        );
      case "storyFragmentPane":
        if (paramType === "param1") {
          return renderContentCombobox(
            "storyFragment",
            value,
            onChange,
            param1Query,
            setParam1Query
          );
        }
        return (
          paramType === "param2" &&
          param1 &&
          renderContentCombobox("pane", value, onChange, param2Query, setParam2Query)
        );
      case "bunny":
        if (paramType === "param1") {
          return renderContentCombobox(
            "storyFragment",
            value,
            onChange,
            param1Query,
            setParam1Query
          );
        }
        return (
          paramType === "param2" && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter time in seconds"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
            />
          )
        );
      case "url":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${paramLabel}`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Target Selection */}
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
              autoComplete="off"
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

      {/* Subcommands (if applicable) */}
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
                autoComplete="off"
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

      {/* First Parameter */}
      {selectedTarget &&
        GOTO_TARGETS[selectedTarget]?.requiresParam &&
        !GOTO_TARGETS[selectedTarget].subcommands && (
          <div className="space-y-2">
            <label className="block text-sm text-gray-700">
              {GOTO_TARGETS[selectedTarget].paramLabel || "Parameter"}
            </label>
            {renderParamInput(
              "param1",
              GOTO_TARGETS[selectedTarget].paramLabel || "Parameter",
              param1,
              (newValue) => {
                setParam1(newValue);
                updateValue(selectedTarget, "", newValue, param2);
              }
            )}
          </div>
        )}

      {/* Second Parameter */}
      {selectedTarget && GOTO_TARGETS[selectedTarget]?.requiresSecondParam && param1 && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">
            {GOTO_TARGETS[selectedTarget].param2Label || "Second Parameter"}
          </label>
          {renderParamInput(
            "param2",
            GOTO_TARGETS[selectedTarget].param2Label || "Second Parameter",
            param2,
            (newValue) => {
              setParam2(newValue);
              updateValue(selectedTarget, "", param1, newValue);
            }
          )}
        </div>
      )}
    </div>
  );
};

export default ActionBuilderField;
