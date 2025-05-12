import { useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { collections } from "@/constants";

interface Props {
  selectedCollection: string;
  onChange: (collection: string) => void;
}

export default function PaneBreakCollectionSelector({ selectedCollection, onChange }: Props) {
  // Create collection for Ark UI Combobox
  const collection = useMemo(
    () =>
      createListCollection({
        items: collections,
        itemToValue: (item) => item,
        itemToString: (item) => item,
      }),
    [collections]
  );

  // Handler for Ark UI's onValueChange
  const handleValueChange = (details: { value: string[] }) => {
    const newValue = details.value[0] || "";
    if (newValue) {
      onChange(newValue);
    }
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .collection-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .collection-item[data-highlighted] .collection-indicator {
      color: white;
    }
    .collection-item[data-state="checked"] .collection-indicator {
      display: flex;
    }
    .collection-item .collection-indicator {
      display: none;
    }
    .collection-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="relative">
      <style>{comboboxItemStyles}</style>

      <Combobox.Root
        collection={collection}
        value={[selectedCollection]}
        onValueChange={handleValueChange}
        loopFocus={true}
        openOnKeyPress={true}
        composite={true}
      >
        <div className="relative mt-1">
          <Combobox.Input
            className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue xs:text-sm"
            autoComplete="off"
          />
          <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
          </Combobox.Trigger>
        </div>
        <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm">
          {collection.items.map((item) => (
            <Combobox.Item
              key={item}
              item={item}
              className="collection-item relative cursor-default select-none py-2 pl-10 pr-4 text-black"
            >
              <span className="block truncate">{item}</span>
              <span className="collection-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Root>
    </div>
  );
}
