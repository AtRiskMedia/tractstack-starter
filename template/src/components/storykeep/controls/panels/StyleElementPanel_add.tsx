import { useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";

const RECOMMENDED_STYLES: { [key: string]: Array<{ key: string; title: string }> } = {
  p: [
    { key: "textSIZE", title: "Text Size" },
    { key: "textCOLOR", title: "Text Color" },
    { key: "lineHEIGHT", title: "Line Height" },
    { key: "mt", title: "Margin Top" },
    { key: "mb", title: "Margin Bottom" },
    { key: "fontWEIGHT", title: "Font Weight" },
    { key: "textALIGN", title: "Text Align" },
  ],
  h2: [
    { key: "textSIZE", title: "Text Size" },
    { key: "textCOLOR", title: "Text Color" },
    { key: "fontWEIGHT", title: "Font Weight" },
    { key: "fontFACE", title: "Font Family" },
    { key: "mt", title: "Margin Top" },
    { key: "mb", title: "Margin Bottom" },
    { key: "textALIGN", title: "Text Align" },
  ],
  h3: [
    { key: "textSIZE", title: "Text Size" },
    { key: "textCOLOR", title: "Text Color" },
    { key: "fontWEIGHT", title: "Font Weight" },
    { key: "fontFACE", title: "Font Family" },
    { key: "mt", title: "Margin Top" },
    { key: "mb", title: "Margin Bottom" },
  ],
  h4: [
    { key: "textSIZE", title: "Text Size" },
    { key: "textCOLOR", title: "Text Color" },
    { key: "fontWEIGHT", title: "Font Weight" },
    { key: "fontFACE", title: "Font Family" },
    { key: "mt", title: "Margin Top" },
  ],
  h5: [
    { key: "textSIZE", title: "Text Size" },
    { key: "textCOLOR", title: "Text Color" },
    { key: "fontWEIGHT", title: "Font Weight" },
    { key: "fontFACE", title: "Font Family" },
    { key: "mt", title: "Margin Top" },
  ],
  ul: [
    { key: "bgCOLOR", title: "Background Color" },
    { key: "borderCOLOR", title: "Border Color" },
    { key: "borderSTYLE", title: "Border Style" },
    { key: "borderWIDTH", title: "Border Width" },
    { key: "rounded", title: "Border Radius" },
    { key: "shadow", title: "Box Shadow" },
    { key: "maxW", title: "Max Width" },
    { key: "p", title: "Padding" },
    { key: "px", title: "Padding X" },
    { key: "py", title: "Padding Y" },
    { key: "m", title: "Margin" },
    { key: "mx", title: "Margin X" },
    { key: "my", title: "Margin Y" },
  ],
  ol: [
    { key: "bgCOLOR", title: "Background Color" },
    { key: "borderCOLOR", title: "Border Color" },
    { key: "borderSTYLE", title: "Border Style" },
    { key: "borderWIDTH", title: "Border Width" },
    { key: "rounded", title: "Border Radius" },
    { key: "shadow", title: "Box Shadow" },
    { key: "maxW", title: "Max Width" },
    { key: "p", title: "Padding" },
    { key: "px", title: "Padding X" },
    { key: "py", title: "Padding Y" },
    { key: "m", title: "Margin" },
    { key: "mx", title: "Margin X" },
    { key: "my", title: "Margin Y" },
  ],
};

const getFilteredStyles = (showAdvanced: boolean, existingClasses: Set<string>) => {
  return Object.entries(tailwindClasses)
    .filter(
      ([key, details]) => (showAdvanced || details.priority <= 1) && !existingClasses.has(key)
    )
    .map(([key, details]) => ({
      key,
      title: details.title,
      className: details.className,
      prefix: details.prefix,
      values: details.values,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const StyleElementPanelAdd = ({ node, parentNode }: BasePanelProps) => {
  console.log(node, parentNode);
  const [query, setQuery] = useState("");
  const showAdvanced = false;
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  if (!node || !node.tagName || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) {
    return null;
  }

  const currentClasses = new Set<string>();

  // Get existing classes from default classes in parent
  if (parentNode.defaultClasses?.[node.tagName]) {
    const defaults = parentNode.defaultClasses[node.tagName];
    Object.keys(defaults.mobile).forEach((key) => currentClasses.add(key));
    if (defaults.tablet) Object.keys(defaults.tablet).forEach((key) => currentClasses.add(key));
    if (defaults.desktop) Object.keys(defaults.desktop).forEach((key) => currentClasses.add(key));
  }

  // Get existing classes from override classes in node
  if (node.overrideClasses) {
    Object.values(node.overrideClasses).forEach((viewportClasses) => {
      Object.keys(viewportClasses).forEach((key) => currentClasses.add(key));
    });
  }

  const styles = getFilteredStyles(showAdvanced, currentClasses);
  const filteredStyles =
    query === ""
      ? styles
      : styles.filter(
          (style) =>
            style.title.toLowerCase().includes(query.toLowerCase()) ||
            style.key.toLowerCase().includes(query.toLowerCase())
        );

  const availableRecommendedStyles =
    RECOMMENDED_STYLES[node.tagName]?.filter((style) => !currentClasses.has(style.key)) || [];

  const handleSelect = useCallback(
    (styleKey: string) => {
      setSelectedStyle(styleKey);
      settingsPanelStore.set({
        nodeId: node.id,
        className: styleKey,
        action: "style-element-update",
      });
    },
    [node.id]
  );

  const handleStyleClick = useCallback(
    (styleKey: string) => {
      settingsPanelStore.set({
        nodeId: node.id,
        className: styleKey,
        action: "style-element-update",
      });
    },
    [node.id]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-element",
    });
  };

  return (
    <div className="space-y-4 min-h-[400px]">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">Add Style ({node.tagName.toUpperCase()})</h2>
        <button
          title="Return to preview pane"
          onClick={handleCancel}
          className="text-myblue hover:text-black"
        >
          Go Back
        </button>
      </div>

      <div className="relative w-full">
        <Combobox value={selectedStyle} onChange={handleSelect}>
          <div className="relative">
            <Combobox.Input
              className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-xl"
              onChange={(event) => setQuery(event.target.value)}
              displayValue={(key: string) => styles.find((style) => style.key === key)?.title || ""}
              placeholder="Search styles..."
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
            </Combobox.Button>
          </div>

          <Combobox.Options className="absolute z-50 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-64 mt-1">
            {filteredStyles.length === 0 && query !== "" ? (
              <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                Nothing found.
              </div>
            ) : (
              filteredStyles.map((style) => (
                <Combobox.Option
                  key={style.key}
                  value={style.key}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-myorange text-white" : "text-black"
                    }`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                        {style.title}
                        <span className="ml-2 text-sm opacity-60">{style.className}</span>
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

      {availableRecommendedStyles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3">Recommended Styles</h3>
          <div className="flex flex-wrap gap-2">
            {availableRecommendedStyles.map((style) => (
              <button
                key={style.key}
                onClick={() => handleStyleClick(style.key)}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm
                       bg-slate-50 hover:bg-mygreen/20 text-black
                       transition-colors duration-200"
              >
                <span className="font-bold">{style.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleElementPanelAdd;
