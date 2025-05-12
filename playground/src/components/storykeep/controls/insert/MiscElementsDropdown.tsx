import { memo } from "react";
import { Menu } from "@ark-ui/react";
import { Portal } from "@ark-ui/react/portal";
import type { ToolAddMode } from "@/types.ts";
import { toolAddModes, toolAddModesIcons, toolAddModeTitles } from "@/constants.ts";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import XMarkIcon from "@heroicons/react/20/solid/XMarkIcon";
import { InsertDraggableElement } from "./InsertDraggableElement.tsx";

export type MiscElementsDropdownProps = {
  onClickedOption: (mode: ToolAddMode) => void;
  currentToolAddMode: ToolAddMode;
};

export const MiscElementsDropdown = memo((props: MiscElementsDropdownProps) => {
  const missingIcon = (mode: ToolAddMode) => {
    return toolAddModesIcons[mode]?.length === 0;
  };

  const filteredModes = toolAddModes.filter(missingIcon);
  const showPill = filteredModes.includes(props.currentToolAddMode);

  // CSS to ensure proper styling for menu items
  const menuStyles = `
    [data-part="content"] {
      z-index: 11000 !important;
    }

    .misc-menu-item[data-highlighted] {
      background-color: #0891b2 !important;
      color: white !important;
    }
    
    .misc-menu-item:focus {
      outline: none;
    }
    
    .misc-menu-root {
      position: relative;
      display: inline-block;
    }
  `;

  if (showPill) {
    return (
      <>
        <span className="text-sm">Add:</span>
        <div className="mx-1 rounded bg-white shadow-xl outline outline-2 outline-black py-2 px-4">
          <div className="flex items-center gap-3 h-5">
            <InsertDraggableElement el={props.currentToolAddMode} onClicked={props.onClickedOption}>
              <span className="text-sm text-black cursor-move">
                {toolAddModeTitles[props.currentToolAddMode]}
              </span>
            </InsertDraggableElement>
            <button
              className="h-5 w-5 rounded-full hover:bg-gray-200 flex items-center justify-center"
              onClick={() => props.onClickedOption("p")}
              aria-label="Clear selection"
            >
              <XMarkIcon className="h-4 w-4 text-black/50 hover:text-black/70" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="ml-4 inline-block misc-menu-root">
      <style>{menuStyles}</style>
      <Menu.Root positioning={{ placement: "top-start" }} closeOnSelect={true}>
        <Menu.Trigger className="inline-flex w-full justify-center rounded-md bg-white/20 px-4 py-2 text-sm text-black hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75">
          More elements
          <ChevronUpDownIcon
            className="-mr-1 ml-2 h-5 w-5 text-black/20 hover:text-black"
            aria-hidden="true"
          />
        </Menu.Trigger>

        <Portal>
          <Menu.Positioner>
            <Menu.Content className="max-h-60 w-56 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-[11000]">
              {filteredModes.map((mode) => (
                <Menu.Item
                  key={mode}
                  value={mode}
                  className="misc-menu-item relative cursor-default select-none py-2 px-4 text-gray-900"
                  onSelect={() => props.onClickedOption(mode as ToolAddMode)}
                >
                  {toolAddModeTitles[mode]}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </div>
  );
});
