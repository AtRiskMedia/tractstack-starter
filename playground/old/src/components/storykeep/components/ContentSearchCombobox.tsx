import { useState } from "react";
import { Combobox } from "@headlessui/react";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import type { FullContentMap } from "../../../types";

interface ContentSearchComboboxProps {
  items: FullContentMap[];
  onSelect: (item: FullContentMap) => void;
}

export function ContentSearchCombobox({ items, onSelect }: ContentSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FullContentMap | null>(null);

  const filteredItems =
    query === ""
      ? items
      : items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (item: FullContentMap | null) => {
    setQuery("");
    setSelectedItem(item);
    if (item) onSelect(item);
  };

  const getItemType = (item: FullContentMap): string => {
    if (item.type === "Pane" && item.isContext) {
      return "Context";
    }
    return item.type;
  };

  const getSecondaryText = (item: FullContentMap): string => {
    const type = getItemType(item);
    if (item.type === "Resource" && item.categorySlug) {
      return `${type} - ${item.categorySlug}`;
    }
    return type;
  };

  return (
    <Combobox<FullContentMap | null> value={selectedItem} onChange={handleSelect}>
      <Combobox.Label htmlFor="quick-find-input" className="block text-lg leading-6 text-black">
        Site webpages look-up
      </Combobox.Label>
      <div className="relative mt-1">
        <Combobox.Input
          id="quick-find-input"
          name="quick-find"
          className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-12 text-black shadow-sm ring-1 ring-inset ring-myblack/20 focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-md xs:leading-6"
          onChange={(event) => setQuery(event.target.value)}
          onBlur={() => setQuery("")}
          displayValue={(item: FullContentMap | null) => item?.title || ""}
          autoComplete="off"
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
          <ChevronUpDownIcon className="h-5 w-5 text-myblack/60" aria-hidden="true" />
        </Combobox.Button>

        {filteredItems.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-md">
            {filteredItems.map((item) => (
              <Combobox.Option
                key={item.id}
                value={item}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                    active ? "bg-myorange/10 text-black" : "text-mydarkgrey"
                  }`
                }
              >
                {({ active, selected }) => (
                  <>
                    <div className="flex flex-col">
                      <span
                        className={`truncate hover:text-myblue ${selected ? "font-bold text-myblue" : "font-normal text-black"}`}
                      >
                        {item.title}
                      </span>
                      <span
                        className={`truncate hover:text-myblue ${active ? "text-myblue" : "text-mydarkgrey"}`}
                      >
                        {getSecondaryText(item)}
                      </span>
                    </div>
                    {selected && (
                      <span
                        className={`absolute inset-y-0 right-0 flex items-center pr-4 ${active ? "text-white" : "text-myorange"}`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </div>
    </Combobox>
  );
}
