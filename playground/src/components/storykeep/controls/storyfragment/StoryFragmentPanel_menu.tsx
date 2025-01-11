import { useState, useMemo, useEffect } from "react";
import { Combobox } from "@headlessui/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { getCtx } from "@/store/nodes";
import type { StoryFragmentNode, MenuNode, MenuLink } from "@/types";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types";

interface StoryFragmentMenuPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentModeType) => void;
}

const StoryFragmentMenuPanel = ({ nodeId, setMode }: StoryFragmentMenuPanelProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(
    storyfragmentNode?.menuId || null
  );
  const [query, setQuery] = useState("");

  // Track menu content in state for reactivity
  const [menuContent, setMenuContent] = useState<MenuNode | null>(null);

  // Get all menu nodes from the context
  const menuNodes = useMemo(() => {
    return Array.from(allNodes.values()).filter(
      (node): node is MenuNode => node.nodeType === "Menu"
    );
  }, [allNodes]);

  // Update menu content when selection changes
  useEffect(() => {
    const menu = selectedMenuId
      ? menuNodes.find((menu) => menu.id === selectedMenuId) || null
      : null;
    setMenuContent(menu);
  }, [selectedMenuId, menuNodes]);

  // Filter menu nodes based on search query
  const filteredMenus =
    query === ""
      ? menuNodes
      : menuNodes.filter((menu) => menu.title.toLowerCase().includes(query.toLowerCase()));

  const handleMenuSelect = (menuId: string | null) => {
    const updatedNode = {
      ...storyfragmentNode,
      hasMenu: !!menuId,
      menuId: menuId,
      isChanged: true,
    };

    const newNodes = new Map(allNodes);
    newNodes.set(nodeId, updatedNode);
    ctx.allNodes.set(newNodes);
    ctx.notifyNode(nodeId);
    setSelectedMenuId(menuId);
  };

  const handleLinkChange = (index: number, field: keyof MenuLink, value: string | boolean) => {
    if (!menuContent) return;

    const updatedMenu = {
      ...menuContent,
      optionsPayload: menuContent.optionsPayload.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
      isChanged: true,
    };

    const newNodes = new Map(allNodes);
    newNodes.set(updatedMenu.id, updatedMenu);
    ctx.allNodes.set(newNodes);
    setMenuContent(updatedMenu);
    ctx.notifyNode(updatedMenu.id);
  };

  const handleAddLink = () => {
    if (!menuContent) return;

    const updatedMenu = {
      ...menuContent,
      optionsPayload: [
        ...menuContent.optionsPayload,
        {
          name: "",
          description: "",
          featured: false,
          actionLisp: "",
        },
      ],
      isChanged: true,
    };

    const newNodes = new Map(allNodes);
    newNodes.set(updatedMenu.id, updatedMenu);
    ctx.allNodes.set(newNodes);
    setMenuContent(updatedMenu);
    ctx.notifyNode(updatedMenu.id);
  };

  const handleRemoveLink = (index: number) => {
    if (!menuContent) return;

    const updatedMenu = {
      ...menuContent,
      optionsPayload: menuContent.optionsPayload.filter((_, i) => i !== index),
      isChanged: true,
    };

    const newNodes = new Map(allNodes);
    newNodes.set(updatedMenu.id, updatedMenu);
    ctx.allNodes.set(newNodes);
    setMenuContent(updatedMenu);
    ctx.notifyNode(updatedMenu.id);
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Menu Configuration</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Combobox value={selectedMenuId} onChange={handleMenuSelect} nullable>
              <div className="relative">
                <Combobox.Input
                  className="w-full rounded-md border border-mydarkgrey py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-sm"
                  onChange={(event) => setQuery(event.target.value)}
                  displayValue={(id: string | null) =>
                    menuNodes.find((menu) => menu.id === id)?.title || ""
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

          {menuContent && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">Menu Links</h3>
              <div className="space-y-4">
                {menuContent.optionsPayload.map((link, index) => (
                  <div key={index} className="border rounded-md p-4 relative">
                    <button
                      onClick={() => handleRemoveLink(index)}
                      className="absolute top-2 right-2 text-mydarkgrey hover:text-black"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium text-mydarkgrey">Name</label>
                        <input
                          type="text"
                          value={link.name}
                          onChange={(e) => handleLinkChange(index, "name", e.target.value)}
                          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-mydarkgrey">
                          Description
                        </label>
                        <input
                          type="text"
                          value={link.description}
                          onChange={(e) => handleLinkChange(index, "description", e.target.value)}
                          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-mydarkgrey">Action</label>
                        <input
                          type="text"
                          value={link.actionLisp}
                          onChange={(e) => handleLinkChange(index, "actionLisp", e.target.value)}
                          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue sm:text-sm"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`featured-${index}`}
                          checked={link.featured}
                          onChange={(e) => handleLinkChange(index, "featured", e.target.checked)}
                          className="rounded border-mydarkgrey text-myblue focus:ring-myblue"
                        />
                        <label htmlFor={`featured-${index}`} className="text-sm text-mydarkgrey">
                          Featured
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddLink}
                  className="flex items-center text-myblue hover:text-myorange"
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentMenuPanel;
