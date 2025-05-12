import { useState, useCallback, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import type { BasePanelProps } from "../SettingsPanel";

// Recommended styles for widget containers (li)
const CONTAINER_STYLES = [
  { key: "bgCOLOR", title: "Background Color" },
  { key: "borderCOLOR", title: "Border Color" },
  { key: "borderSTYLE", title: "Border Style" },
  { key: "borderWIDTH", title: "Border Width" },
  { key: "rounded", title: "Border Radius" },
  { key: "shadow", title: "Box Shadow" },
  { key: "p", title: "Padding" },
  { key: "px", title: "Padding X" },
  { key: "py", title: "Padding Y" },
  { key: "m", title: "Margin" },
  { key: "mx", title: "Margin X" },
  { key: "my", title: "Margin Y" },
];

// Recommended styles for outer containers (ul/ol)
const OUTER_CONTAINER_STYLES = [
  { key: "bgCOLOR", title: "Background Color" },
  { key: "maxW", title: "Max Width" },
  { key: "rounded", title: "Border Radius" },
  { key: "shadow", title: "Box Shadow" },
  { key: "p", title: "Padding" },
  { key: "m", title: "Margin" },
  { key: "gap", title: "Gap Between Items" },
  { key: "columns", title: "Column Layout" },
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

interface StyleOption {
  key: string;
  title: string;
  className: string;
  prefix: string;
  values: string[];
}

const StyleWidgetPanelAdd = ({ node, parentNode, childId }: BasePanelProps) => {
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  if (!node?.tagName || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) return null;

  const isOuterContainer = node.tagName === "ul" || node.tagName === "ol";
  const isContainer = node.tagName === "li";
  const isWidget = node.tagName === "code";

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  // When styling container or outer container, use their IDs directly
  const targetNode = allNodes.get(node.id);
  if (!targetNode) return null;

  const currentClasses = new Set<string>();

  // Get existing classes from default classes in parent for THIS element type
  if (parentNode.defaultClasses?.[node.tagName]) {
    const defaults = parentNode.defaultClasses[node.tagName];
    Object.keys(defaults.mobile).forEach((key) => currentClasses.add(key));
    if (defaults.tablet) Object.keys(defaults.tablet).forEach((key) => currentClasses.add(key));
    if (defaults.desktop) Object.keys(defaults.desktop).forEach((key) => currentClasses.add(key));
  }

  // Get existing override classes for THIS element
  if (`overrideClasses` in targetNode && targetNode.overrideClasses) {
    Object.values(targetNode.overrideClasses).forEach((viewportClasses) => {
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

  // Create collection for Ark UI Combobox
  const collection = useMemo(
    () =>
      createListCollection({
        items: filteredStyles,
        itemToValue: (item: StyleOption) => item.key,
        itemToString: (item: StyleOption) => item.title,
      }),
    [filteredStyles]
  );

  // Get appropriate recommended styles based on element type
  const recommendedStyles = isOuterContainer
    ? OUTER_CONTAINER_STYLES
    : isContainer
      ? CONTAINER_STYLES
      : [];

  const availableRecommendedStyles = recommendedStyles.filter(
    (style) => !currentClasses.has(style.key)
  );

  const handleSelect = useCallback(
    (details: { value: string[] }) => {
      const styleKey = details.value[0] || "";
      if (!styleKey) return;

      setSelectedStyle(styleKey);
      settingsPanelStore.set({
        action: isOuterContainer
          ? "style-code-outer-update"
          : isContainer
            ? "style-code-container-update"
            : "style-code-update",
        nodeId: node.id,
        childId, // Preserve childId for container context
        className: styleKey,
        expanded: true,
      });
    },
    [node.id, childId, isOuterContainer, isContainer, isWidget]
  );

  const handleCancel = () => {
    // Return to main panel with correct context
    settingsPanelStore.set({
      action: "style-widget",
      nodeId: childId || node.id, // Use childId when available for context
      expanded: true,
    });
  };

  const elementTypeTitle = isOuterContainer
    ? "Outer Container"
    : isContainer
      ? "Container"
      : "Widget";

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .style-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .style-item[data-highlighted] .style-indicator {
      color: white;
    }
    .style-item[data-state="checked"] .style-indicator {
      display: flex;
    }
    .style-item .style-indicator {
      display: none;
    }
    .style-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4 min-h-[400px] max-w-md">
      <style>{comboboxItemStyles}</style>

      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">Add Style ({elementTypeTitle})</h2>
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
          className="h-4 w-4 text-cyan-600 focus:ring-cyan-600 border-mydarkgrey rounded"
        />
        <label htmlFor="show-advanced" className="text-sm text-mydarkgrey">
          Show Advanced Styles
        </label>
      </div>

      <div className="relative w-full">
        <Combobox.Root
          collection={collection}
          value={selectedStyle ? [selectedStyle] : []}
          onValueChange={handleSelect}
          loopFocus={true}
          openOnKeyPress={true}
          composite={true}
        >
          <div className="relative">
            <Combobox.Input
              className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-xl"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search styles..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
            </Combobox.Trigger>
          </div>

          <Combobox.Content className="absolute z-50 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-64 mt-1">
            {collection.items.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                Nothing found.
              </div>
            ) : (
              collection.items.map((style) => (
                <Combobox.Item
                  key={style.key}
                  item={style}
                  className="style-item relative cursor-default select-none py-2 pl-10 pr-4 text-black"
                >
                  <span className="block truncate">
                    {style.title}
                    <span className="ml-2 text-sm opacity-60">{style.className}</span>
                  </span>
                  <span className="style-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </Combobox.Item>
              ))
            )}
          </Combobox.Content>
        </Combobox.Root>
      </div>

      {availableRecommendedStyles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3">Recommended Styles</h3>
          <div className="flex flex-wrap gap-2">
            {availableRecommendedStyles.map((style) => (
              <button
                key={style.key}
                onClick={() => handleSelect({ value: [style.key] })}
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

export default StyleWidgetPanelAdd;
