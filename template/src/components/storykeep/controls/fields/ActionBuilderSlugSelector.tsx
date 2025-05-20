import { useMemo, useEffect, useRef } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import type { FullContentMap } from "@/types";

interface ActionBuilderSlugSelectorProps {
  type: "storyFragment" | "context" | "pane";
  value: string;
  onSelect: (value: string) => void;
  query: string;
  setQuery: (query: string) => void;
  label: string;
  placeholder: string;
  contentMap: FullContentMap[];
  parentSlug?: string;
}

const ActionBuilderSlugSelector = ({
  type,
  value,
  onSelect,
  query,
  setQuery,
  label,
  placeholder,
  contentMap,
  parentSlug,
}: ActionBuilderSlugSelectorProps) => {
  // Use a ref to track if the initial sync has occurred
  const initialSyncDone = useRef(false);

  // Filter items based on type and query
  const filteredItems = useMemo(() => {
    let items: FullContentMap[] = [];
    switch (type) {
      case "storyFragment":
        items = contentMap.filter((item) => item.type === "StoryFragment");
        break;
      case "context":
        items = contentMap.filter(
          (item) => item.type === "Pane" && "isContext" in item && item.isContext
        );
        break;
      case "pane": {
        if (parentSlug) {
          const parentFragment = contentMap.find(
            (item) => item.type === "StoryFragment" && item.slug === parentSlug
          ) as (FullContentMap & { panes?: string[] }) | undefined;

          if (parentFragment?.panes) {
            items = contentMap.filter(
              (item) =>
                item.type === "Pane" &&
                "isContext" in item &&
                !item.isContext &&
                parentFragment.panes?.includes(item.id)
            );
          }
        }
        break;
      }
    }

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.slug.toLowerCase().includes(query.toLowerCase())
    );
  }, [contentMap, type, query, parentSlug]);

  // Create collection
  const collection = useMemo(() => {
    return createListCollection({
      items: filteredItems,
      itemToValue: (item) => item.slug,
      itemToString: (item) => `${item.title} (${item.slug})`,
    });
  }, [filteredItems]);

  // Perform initial sync of value to query display
  useEffect(() => {
    // Only perform this sync once or when value changes
    if (!initialSyncDone.current || (value && query === "")) {
      initialSyncDone.current = true;

      if (value) {
        const selectedItem = contentMap.find((item) => item.slug === value);
        if (selectedItem) {
          // This won't cause an infinite loop because we're not including setQuery in dependencies
          setQuery(`${selectedItem.title} (${selectedItem.slug})`);
        }
      }
    }
  }, [value, contentMap, query]);

  const comboboxItemStyles = `
    .slug-item[data-highlighted] {
      background-color: #0891b2;
      color: white;
    }
    .slug-item[data-highlighted] .slug-indicator {
      color: white;
    }
    .slug-item[data-state="checked"] .slug-indicator {
      display: flex;
    }
    .slug-item .slug-indicator {
      display: none;
    }
    .slug-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-2">
      <style>{comboboxItemStyles}</style>
      <label className="block text-sm text-gray-700">{label}</label>
      <Combobox.Root
        collection={collection}
        value={value ? [value] : []}
        inputValue={query}
        onValueChange={(details) => {
          const selectedValue = details.value[0] || "";
          onSelect(selectedValue);
        }}
        onInputValueChange={(details) => {
          setQuery(details.inputValue);
        }}
      >
        <div className="relative">
          <Combobox.Input
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-myblue focus:ring-myblue"
            placeholder={placeholder}
          />
          <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Trigger>
        </div>

        <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full max-w-md overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredItems.length === 0 ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              Nothing found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <Combobox.Item
                key={item.id}
                item={item}
                className="slug-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
              >
                <span className="block truncate">
                  {item.title}
                  <span className="ml-2 text-sm opacity-60">({item.slug})</span>
                </span>
                <span className="slug-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              </Combobox.Item>
            ))
          )}
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
};

export default ActionBuilderSlugSelector;
