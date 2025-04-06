import { useState, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { getCtx } from "@/store/nodes";
import { contentMap } from "@/store/events";
import { cloneDeep } from "@/utils/common/helpers.ts";
import MenuEditor from "@/components/storykeep/controls/manage/MenuEditor";
import type { StoryFragmentNode, MenuNode } from "@/types";
import { StoryFragmentMode } from "@/types";

interface StoryFragmentMenuPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
}

const StoryFragmentMenuPanel = ({ nodeId, setMode }: StoryFragmentMenuPanelProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(
    storyfragmentNode?.menuId || null
  );
  const [query, setQuery] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<MenuNode | null>(null);
  const [showMenuEditor, setShowMenuEditor] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch("/api/turso/getAllMenus");
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch menus");
        }

        setMenus(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch menus");
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, []);

  useEffect(() => {
    // When a menu is selected, find the corresponding menu object
    if (selectedMenuId) {
      const menu = menus.find((menu) => menu.id === selectedMenuId);
      setSelectedMenu(menu || null);
    } else {
      setSelectedMenu(null);
    }
  }, [selectedMenuId, menus]);

  const filteredMenus =
    query === ""
      ? menus
      : menus.filter((menu) => menu.title.toLowerCase().includes(query.toLowerCase()));

  const handleMenuSelect = (menuId: string | null) => {
    // Just update the selected menu ID
    setSelectedMenuId(menuId);

    // Also update the story fragment node's menu reference
    const updatedNode = {
      ...cloneDeep(storyfragmentNode),
      hasMenu: !!menuId,
      menuId: menuId,
      isChanged: true,
    };
    ctx.modifyNodes([updatedNode]);
  };

  const handleUnlinkMenu = () => {
    // Remove menu reference from story fragment
    const updatedNode = {
      ...cloneDeep(storyfragmentNode),
      hasMenu: false,
      menuId: null,
      isChanged: true,
    };
    ctx.modifyNodes([updatedNode]);
    setSelectedMenuId(null);
    setSelectedMenu(null);
  };

  if (loading) return <div className="px-3.5 py-6">Loading menus...</div>;
  if (error) return <div className="px-3.5 py-6 text-red-500">Error: {error}</div>;

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Menu Configuration</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Close Panel
          </button>
        </div>

        {selectedMenu ? (
          <>
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-lg">{selectedMenu.title}</h4>
                <button
                  onClick={handleUnlinkMenu}
                  className="text-red-600 hover:text-red-800 flex items-center"
                >
                  <XMarkIcon className="h-5 w-5 mr-1" />
                  Unlink menu from this page
                </button>
              </div>
              <p className="text-gray-600">
                This menu has {selectedMenu.optionsPayload.length} links.
              </p>
              {!showMenuEditor && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMenuEditor(true)}
                    className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    Edit Menu
                  </button>
                </div>
              )}
            </div>

            {showMenuEditor && (
              <div className="mt-4">
                <MenuEditor
                  menu={selectedMenu}
                  create={false}
                  contentMap={contentMap.get()}
                  embedded={true}
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <Combobox value={selectedMenuId} onChange={handleMenuSelect} nullable>
                <div className="relative">
                  <Combobox.Input
                    className="w-full rounded-md border border-mydarkgrey py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-sm"
                    onChange={(event) => setQuery(event.target.value)}
                    displayValue={(id: string | null) =>
                      menus.find((menu) => menu.id === id)?.title || ""
                    }
                    placeholder="Select a menu..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                  </Combobox.Button>
                </div>

                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredMenus.length === 0 && query !== "" ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                      Nothing found.
                    </div>
                  ) : (
                    filteredMenus.map((menu) => (
                      <Combobox.Option
                        key={menu.id}
                        value={menu.id}
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
                              {menu.title}
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
            <p className="text-gray-600">
              Select an existing menu to link to this page. To create new menus, use the Menu
              Manager in the main Story Keep dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryFragmentMenuPanel;
