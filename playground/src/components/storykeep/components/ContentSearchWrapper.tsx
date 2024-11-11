import { useState, useEffect, useMemo } from "react";
import { ContentSearchCombobox } from "./ContentSearchCombobox";
import { ContentTypeFilter } from "./ContentTypeFilter";
import type { FullContentMap } from "../../../types";

interface ContentSearchWrapperProps {
  contentMap: FullContentMap[];
}

const typeOrder = ["StoryFragment", "Context Page", "Pane", "Menu", "Resource"];

export function ContentSearchWrapper({ contentMap }: ContentSearchWrapperProps) {
  const [selectedItem, setSelectedItem] = useState<FullContentMap | null>(null);
  const [filteredItems, setFilteredItems] = useState<FullContentMap[]>(contentMap);

  const allTypes = useMemo(() => {
    const types = Array.from(new Set(contentMap.map((item) => getItemType(item))));
    return [
      ...typeOrder.filter((type) => types.includes(type)),
      ...types.filter((type) => !typeOrder.includes(type)),
    ];
  }, [contentMap]);

  const defaultTypes = useMemo(
    () => allTypes.filter((type) => ["StoryFragment", "Context Page"].includes(type)),
    [allTypes]
  );

  const [selectedTypes, setSelectedTypes] = useState<string[]>(defaultTypes);

  useEffect(() => {
    const newFilteredItems = contentMap
      .filter((item) => selectedTypes.includes(getItemType(item)))
      .sort((a, b) => {
        const aType = getItemType(a);
        const bType = getItemType(b);
        const aIndex = typeOrder.indexOf(aType);
        const bIndex = typeOrder.indexOf(bType);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    setFilteredItems(newFilteredItems);
  }, [selectedTypes, contentMap]);

  const handleSelect = (item: FullContentMap) => {
    setSelectedItem(item);
  };

  const getUrl = (action: string, item: FullContentMap) => {
    switch (item.type) {
      case `Resource`:
      case `Menu`:
        console.log(`NOT YET IMPLEMENTED`);
        break;
      case `StoryFragment`:
        if (action === `visit`) return `/${item.slug}`;
        else if (action === `edit`) return `/${item.slug}/edit`;
        break;
      case `Pane`:
        if (!item.isContext) {
          console.log(`NOT YET IMPLEMENTED`);
          return `/`;
        } else if (action === `visit`) return `/context/${item.slug}`;
        else if (action === `edit`) return `/context/${item.slug}/edit`;
        break;
      default:
        console.log(`unknown item type`);
    }
  };

  const handleTypeChange = (types: string[]) => {
    setSelectedTypes(types);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap md:flex-nowrap gap-x-12 gap-y-4">
        <div className="w-full md:w-1/2 max-w-lg">
          <ContentSearchCombobox items={filteredItems} onSelect={handleSelect} />
        </div>
        <div className="w-full md:w-1/2">
          <ContentTypeFilter
            types={allTypes}
            selectedTypes={selectedTypes}
            onChange={handleTypeChange}
          />
        </div>
      </div>
      {selectedItem && (
        <div className="mt-6 max-w-xl rounded-md bg-myoffwhite/20 shadow-inner w-full py-3.5 px-4">
          <h3 className="text-lg mr-10 truncate">
            {selectedItem.type}: <strong>{selectedItem.title}</strong>
          </h3>
          <p className="pb-2 text-mydarkgrey">
            slug: <em>{selectedItem.slug}</em>
          </p>
          <div className="flex flex-nowrap gap-x-3.5 text-md">
            <a
              data-astro-reload
              className="underline font-bold hover:text-myorange"
              href={getUrl(`visit`, selectedItem)}
            >
              VISIT
            </a>
            <a
              href={getUrl(`edit`, selectedItem)}
              className="underline font-bold hover:text-myorange"
            >
              EDIT
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function getItemType(item: FullContentMap): string {
  if (item.type === "Pane" && item.isContext) {
    return "Context Page";
  }
  return item.type;
}
