import { useState, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
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
  const [param3, setParam3] = useState<string>("");
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
              if (parts.length > 3) setParam3(parts[3]);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing action value:", e);
      }
    }
  }, [value]);

  const updateValue = (
    target: string,
    sub: string = "",
    p1: string = "",
    p2: string = "",
    p3: string = ""
  ) => {
    let newValue = `(goto (${target}`;
    if (GOTO_TARGETS[target]?.subcommands) {
      if (sub) newValue += ` ${sub}`;
    } else {
      if (p1) newValue += ` ${p1}`;
      if (p2) newValue += ` ${p2}`;
      if (p3) newValue += ` ${p3}`;
    }
    newValue += "))";
    onChange(newValue);
  };

  // Create collection for target options
  const targetCollection = useMemo(() => {
    const targets = Object.entries(GOTO_TARGETS)
      .filter(
        ([key, data]) =>
          data.name.toLowerCase().includes(targetQuery.toLowerCase()) ||
          key.toLowerCase().includes(targetQuery.toLowerCase())
      )
      .map(([key, data]) => ({ key, data }));

    return createListCollection({
      items: targets,
      itemToValue: (item) => item.key,
      itemToString: (item) => item.data.name,
    });
  }, [GOTO_TARGETS, targetQuery]);

  // Create collection for subcommand options when needed
  const subcommandCollection = useMemo(() => {
    if (!selectedTarget || !GOTO_TARGETS[selectedTarget]?.subcommands) {
      return createListCollection({
        items: [] as { value: string }[],
        itemToValue: (item) => item.value,
        itemToString: (item) => item.value,
      });
    }

    const subcommands = GOTO_TARGETS[selectedTarget]
      .subcommands!.filter((cmd) => cmd.toLowerCase().includes(subcommandQuery.toLowerCase()))
      .map((cmd) => ({ value: cmd }));

    return createListCollection({
      items: subcommands,
      itemToValue: (item) => item.value,
      itemToString: (item) => item.value,
    });
  }, [selectedTarget, GOTO_TARGETS, subcommandQuery]);

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
              videoId={param3}
              onSelect={(newValue, videoId) => {
                setParam2(newValue);
                if (videoId) setParam3(videoId);
                updateValue(selectedTarget, "", param1, newValue, videoId);
              }}
              label="Select Start Time"
            />
          )
        );

      default:
        return null;
    }
  };

  const handleTargetSelect = (details: { value: string[] }) => {
    const target = details.value[0] || "";
    setSelectedTarget(target);
    setSelectedSubcommand("");
    setParam1("");
    setParam2("");
    updateValue(target);
  };

  const handleSubcommandSelect = (details: { value: string[] }) => {
    const sub = details.value[0] || "";
    setSelectedSubcommand(sub);
    updateValue(selectedTarget, sub);
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .target-item[data-highlighted] {
      background-color: #0891b2; /* bg-bg-cyan-600 */
      color: white;
    }
    .target-item[data-highlighted] .target-indicator {
      color: white;
    }
    .target-item[data-state="checked"] .target-indicator {
      display: flex;
    }
    .target-item .target-indicator {
      display: none;
    }
    .target-item[data-state="checked"] {
      font-weight: bold;
    }
    
    .subcommand-item[data-highlighted] {
      background-color: #0891b2; /* bg-bg-cyan-600 */
      color: white;
    }
    .subcommand-item[data-highlighted] .subcommand-indicator {
      color: white;
    }
    .subcommand-item[data-state="checked"] .subcommand-indicator {
      display: flex;
    }
    .subcommand-item .subcommand-indicator {
      display: none;
    }
    .subcommand-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4 max-w-md">
      <style>{comboboxItemStyles}</style>

      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Navigation Target</label>
        <Combobox.Root
          collection={targetCollection}
          value={selectedTarget ? [selectedTarget] : []}
          onValueChange={handleTargetSelect}
          loopFocus={true}
          openOnKeyPress={true}
          composite={true}
        >
          <div className="relative">
            <Combobox.Input
              autoComplete="off"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
              onChange={(e) => setTargetQuery(e.target.value)}
              placeholder="Select a target..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Trigger>
          </div>

          <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full max-w-md overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {targetCollection.items.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                Nothing found.
              </div>
            ) : (
              targetCollection.items.map((item) => (
                <Combobox.Item
                  key={item.key}
                  item={item}
                  className="target-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                >
                  <span className="block truncate">{item.data.name}</span>
                  <span className="target-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-bg-cyan-600">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </Combobox.Item>
              ))
            )}
          </Combobox.Content>
        </Combobox.Root>

        {GOTO_TARGETS[selectedTarget] && (
          <p className="mt-1 text-sm text-gray-500">{GOTO_TARGETS[selectedTarget].description}</p>
        )}
      </div>

      {selectedTarget && GOTO_TARGETS[selectedTarget]?.subcommands && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">Section</label>
          <Combobox.Root
            collection={subcommandCollection}
            value={selectedSubcommand ? [selectedSubcommand] : []}
            onValueChange={handleSubcommandSelect}
            loopFocus={true}
            openOnKeyPress={true}
            composite={true}
          >
            <div className="relative">
              <Combobox.Input
                autoComplete="off"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
                onChange={(e) => setSubcommandQuery(e.target.value)}
                placeholder="Select a section..."
              />
              <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </Combobox.Trigger>
            </div>

            <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full max-w-md overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {subcommandCollection.items.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                subcommandCollection.items.map((item) => (
                  <Combobox.Item
                    key={item.value}
                    item={item}
                    className="subcommand-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                  >
                    <span className="block truncate">{item.value}</span>
                    <span className="subcommand-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-bg-cyan-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Combobox.Item>
                ))
              )}
            </Combobox.Content>
          </Combobox.Root>
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
