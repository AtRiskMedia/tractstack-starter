import { useState, useRef } from "react";
import { useDropdownDirection } from "../../../hooks/useDropdownDirection";
import { Combobox } from "@headlessui/react";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import { useStore } from "@nanostores/react";
import { storyFragmentMenuId } from "../../../store/storykeep";
import type { StoreKey, MenuDatum } from "../../../types";

interface StoryFragmentMenuIdProps {
  id: string;
  isEditing: Partial<Record<StoreKey, boolean>>;
  handleEditingChange: (storeKey: StoreKey, editing: boolean) => void;
  updateStoreField: (storeKey: StoreKey, newValue: string) => boolean;
  handleUndo: (storeKey: StoreKey, id: string) => void;
  payload: MenuDatum[];
}

const StoryFragmentMenuId = ({
  id,
  handleEditingChange,
  updateStoreField,
  handleUndo,
  payload,
}: StoryFragmentMenuIdProps) => {
  const menus = payload;
  const $storyFragmentMenuId = useStore(storyFragmentMenuId, { keys: [id] });
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove, maxHeight } = useDropdownDirection(comboboxRef);

  const [query, setQuery] = useState("");

  const currentMenuId = $storyFragmentMenuId[id]?.current;
  const selectedMenu = menus.find((menu) => menu.id === currentMenuId) || null;

  const filteredMenus =
    query === ""
      ? menus
      : menus.filter((menu) => menu.id.toLowerCase().includes(query.toLowerCase()));

  const handleMenuChange = (menu: MenuDatum | null) => {
    setQuery("");
    if (menu) {
      updateStoreField("storyFragmentMenuId", menu.id);
    } else {
      updateStoreField("storyFragmentMenuId", "");
    }
    handleEditingChange("storyFragmentMenuId", false);
  };

  const handleUndoClick = () => {
    handleUndo("storyFragmentMenuId", id);
  };

  return (
    <div className="flex items-center space-x-4 py-3">
      <span
        id="storyFragmentMenuId-label"
        className="flex items-center text-md text-mydarkgrey flex-shrink-0"
      >
        Use menu?
      </span>
      <div className="flex-grow relative" ref={comboboxRef}>
        <Combobox value={selectedMenu} onChange={handleMenuChange}>
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => handleEditingChange("storyFragmentMenuId", true)}
              displayValue={(menu: MenuDatum | null) => menu?.title || ""}
              placeholder="Select a menu (or leave blank for no menu)"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-myblue" aria-hidden="true" />
            </Combobox.Button>
          </div>

          <Combobox.Options
            className={`absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm ${
              openAbove ? "bottom-full mb-1" : "top-full mt-1"
            }`}
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Combobox.Option
              value={null}
              className={({ active }) =>
                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                  active ? "bg-myblack text-white" : "text-myblack"
                }`
              }
            >
              {({ selected, active }) => (
                <>
                  <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                    No menu
                  </span>
                  {selected && (
                    <span
                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                        active ? "text-white" : "text-mygreen"
                      }`}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </>
              )}
            </Combobox.Option>
            {filteredMenus.map((menu) => (
              <Combobox.Option
                key={menu.id}
                value={menu}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-myblack text-white" : "text-myblack"
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                      {menu.title}
                    </span>
                    {selected && (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-mygreen"
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox>
      </div>
      <button
        onClick={handleUndoClick}
        className="disabled:hidden ml-2"
        disabled={$storyFragmentMenuId[id]?.history.length === 0}
      >
        <ChevronDoubleLeftIcon
          className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
          title="Undo"
        />
      </button>
    </div>
  );
};

export default StoryFragmentMenuId;
