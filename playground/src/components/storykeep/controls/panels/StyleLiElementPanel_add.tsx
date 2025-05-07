import { useState, useCallback, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses.ts";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards.tsx";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode } from "@/types.ts";

// Recommended styles for list items
const LIST_ITEM_STYLES = [
  { key: "textSIZE", title: "Text Size" },
  { key: "textCOLOR", title: "Text Color" },
  { key: "lineHEIGHT", title: "Line Height" },
  { key: "px", title: "Padding X" },
  { key: "py", title: "Padding Y" },
  { key: "mx", title: "Margin X" },
  { key: "my", title: "Margin Y" },
  { key: "fontWEIGHT", title: "Font Weight" },
  { key: "fontFACE", title: "Font Family" },
];

// Recommended styles for list containers
const LIST_CONTAINER_STYLES = [
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

const StyleLiElementAddPanel = ({ node, parentNode, childId }: BasePanelProps) => {
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  if (!node?.tagName || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) return null;

  // Determine if we're styling a container or list item
  const isContainer = node.tagName === "ul" || node.tagName === "ol";

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  // Get the correct node based on what we're styling
  const targetNodeId = isContainer ? node.id : childId || node.id;
  const targetNode = allNodes.get(targetNodeId) as FlatNode;

  if (!targetNode) return null;

  const currentClasses = new Set<string>();

  // Get existing classes from default classes in parent
  if (parentNode.defaultClasses?.[targetNode.tagName]) {
    const defaults = parentNode.defaultClasses[targetNode.tagName];
    Object.keys(defaults.mobile).forEach((key) => currentClasses.add(key));
    if (defaults.tablet) Object.keys(defaults.tablet).forEach((key) => currentClasses.add(key));
    if (defaults.desktop) Object.keys(defaults.desktop).forEach((key) => currentClasses.add(key));
  }

  // Get existing classes from override classes in node
  if (targetNode.overrideClasses) {
    Object.values(targetNode.overrideClasses).forEach((viewportClasses) => {
      Object.keys(viewportClasses).forEach((key) => currentClasses.add(key));
    });
  }

  const styles = getFilteredStyles(showAdvanced, currentClasses);

  // Create collection for combobox
  const collection = useMemo(() => {
    const filteredStyles =
      query === ""
        ? styles
        : styles.filter(
            (style) =>
              style.title.toLowerCase().includes(query.toLowerCase()) ||
              style.key.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredStyles,
      itemToValue: (item) => item.key,
      itemToString: (item) => item.title,
    });
  }, [styles, query]);

  // Get appropriate recommended styles based on element type
  const recommendedStyles = isContainer ? LIST_CONTAINER_STYLES : LIST_ITEM_STYLES;
  const availableRecommendedStyles = recommendedStyles.filter(
    (style) => !currentClasses.has(style.key)
  );

  const handleInputChange = useCallback((details: Combobox.InputValueChangeDetails) => {
    setQuery(details.inputValue);
  }, []);

  const handleValueChange = useCallback(
    (details: { value: string[] }) => {
      const styleKey = details.value[0] || "";
      if (!styleKey) return;

      setSelectedStyle(null);
      settingsPanelStore.set({
        action: isContainer ? "style-li-container-update" : "style-li-element-update",
        nodeId: targetNodeId,
        childId: isContainer ? childId : undefined,
        className: styleKey,
        expanded: true,
      });
    },
    [targetNodeId, isContainer, childId]
  );

  const handleStyleClick = useCallback(
    (styleKey: string) => {
      settingsPanelStore.set({
        action: isContainer ? "style-li-container-update" : "style-li-element-update",
        nodeId: targetNodeId,
        childId: isContainer ? childId : undefined,
        className: styleKey,
        expanded: true,
      });
    },
    [targetNodeId, isContainer, childId]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      action: "style-li-element",
      nodeId: isContainer && typeof childId === `string` ? childId : targetNodeId,
      expanded: true,
    });
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .style-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .style-item[data-highlighted] .style-indicator {
      color: white !important;
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
        <h2 className="text-xl font-bold">Add Style ({isContainer ? "Container" : "List Item"})</h2>
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
          onValueChange={handleValueChange}
          onInputValueChange={handleInputChange}
          loopFocus={true}
          openOnKeyPress={true}
          composite={true}
        >
          <div className="relative">
            <Combobox.Input
              className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-xl"
              placeholder="Search styles..."
              autoComplete="off"
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
              collection.items.map((item) => (
                <Combobox.Item
                  key={item.key}
                  item={item}
                  className="style-item relative cursor-default select-none py-2 pl-10 pr-4"
                >
                  <span className="block truncate">
                    {item.title}
                    <span className="ml-2 text-sm opacity-60">{item.className}</span>
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

export default StyleLiElementAddPanel;
