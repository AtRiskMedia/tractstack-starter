import { useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";
import type { PaneFragmentNode } from "../../../../types";

const RECOMMENDED_STYLES = [
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
  { key: "opacity", title: "Opacity" },
  { key: "backdrop", title: "Backdrop Filter" },
];

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

const StyleParentPanelAdd = ({ node, layer }: BasePanelProps) => {
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const paneFragmentNode = node as PaneFragmentNode | null;

  if (!paneFragmentNode || !isMarkdownPaneFragmentNode(paneFragmentNode) || !layer) {
    return null;
  }

  const currentLayerClasses = new Set<string>();

  if (paneFragmentNode.parentClasses?.[layer - 1]) {
    const layerClasses = paneFragmentNode.parentClasses[layer - 1];
    Object.keys(layerClasses.mobile || {}).forEach((key) => currentLayerClasses.add(key));
    Object.keys(layerClasses.tablet || {}).forEach((key) => currentLayerClasses.add(key));
    Object.keys(layerClasses.desktop || {}).forEach((key) => currentLayerClasses.add(key));
  }

  const styles = getFilteredStyles(showAdvanced, currentLayerClasses);
  const filteredStyles =
    query === ""
      ? styles
      : styles.filter(
          (style) =>
            style.title.toLowerCase().includes(query.toLowerCase()) ||
            style.key.toLowerCase().includes(query.toLowerCase())
        );

  const availableRecommendedStyles = RECOMMENDED_STYLES.filter(
    (style) => !currentLayerClasses.has(style.key)
  );

  const handleSelect = useCallback(
    (styleKey: string) => {
      setSelectedStyle(styleKey);
      settingsPanelStore.set({
        nodeId: paneFragmentNode.id,
        layer: layer,
        className: styleKey,
        action: "style-parent-update",
      });
    },
    [paneFragmentNode.id, layer]
  );

  const handleStyleClick = useCallback(
    (styleKey: string) => {
      settingsPanelStore.set({
        nodeId: paneFragmentNode.id,
        layer: layer,
        className: styleKey,
        action: "style-parent-update",
      });
    },
    [paneFragmentNode.id, layer]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: paneFragmentNode.id,
      layer: layer,
      action: "style-parent",
    });
  };

  return (
    <div className="space-y-4 min-h-[400px]">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">Add Style (Layer {layer})</h2>
        <button
          title="Return to preview pane"
          onClick={handleCancel}
          className="text-myblue hover:text-black"
        >
          Go Back
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="show-advanced"
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
          className="h-4 w-4 text-myorange focus:ring-myorange border-mydarkgrey rounded"
        />
        <label htmlFor="show-advanced" className="text-sm text-mydarkgrey">
          Show Advanced Styles
        </label>
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

          <div className="relative w-full">
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
                        <span
                          className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                        >
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
          </div>
        </Combobox>
      </div>

      {availableRecommendedStyles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Recommended Styles</h3>
          <div className="flex flex-wrap gap-2">
            {availableRecommendedStyles.map((style) => (
              <button
                key={style.key}
                onClick={() => handleStyleClick(style.key)}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm
                         bg-slate-50 hover:bg-mygreen/20 text-black
                         transition-colors duration-200"
              >
                <span className="font-medium">{style.title}</span>
                <span className="ml-2 text-xs text-mydarkgrey">
                  {tailwindClasses[style.key]?.className}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleParentPanelAdd;
