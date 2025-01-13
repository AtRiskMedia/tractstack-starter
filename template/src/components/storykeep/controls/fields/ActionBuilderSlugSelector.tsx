import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import type { ContentMap } from "@/types";

interface ActionBuilderSlugSelectorProps {
  type: "storyFragment" | "context" | "pane";
  value: string;
  onSelect: (value: string) => void;
  query: string;
  setQuery: (query: string) => void;
  label: string;
  placeholder: string;
  contentMap: ContentMap[];
  parentSlug?: string; // For filtering panes by parent story fragment
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
  // Filter content map based on type and query
  const getFilteredItems = () => {
    let items: ContentMap[] = [];
    switch (type) {
      case "storyFragment":
        items = contentMap.filter((item) => item.type === "StoryFragment");
        break;
      case "context":
        items = contentMap.filter((item) => item.type === "Pane" && item.isContextPane);
        break;
      case "pane": {
        // Get the story fragment that matches the parentSlug
        const parentFragment = contentMap.find(
          (item) => item.type === "StoryFragment" && item.slug === parentSlug
        );

        if (parentFragment) {
          // Filter panes that belong to this story fragment using parentId
          items = contentMap.filter(
            (item) =>
              item.type === "Pane" && !item.isContextPane && item.parentId === parentFragment.id
          );
        }
        break;
      }
    }

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.slug.toLowerCase().includes(query.toLowerCase())
    );
  };

  const items = getFilteredItems();

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-700">{label}</label>
      <Combobox value={value} onChange={onSelect}>
        <div className="relative">
          <Combobox.Input
            className="pr-8 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
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
          {items.length === 0 ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              Nothing found.
            </div>
          ) : (
            items.map((item) => (
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
            ))
          )}
        </Combobox.Options>
      </Combobox>
    </div>
  );
};

export default ActionBuilderSlugSelector;
