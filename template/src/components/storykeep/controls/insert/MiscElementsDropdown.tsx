import { Fragment, memo } from "react";
import type { ToolAddMode } from "@/types.ts";
import { toolAddModes, toolAddModesIcons, toolAddModeTitles } from "@/constants.ts";
import { Menu, Transition } from "@headlessui/react";
import ChevronDownIcon from "@heroicons/react/20/solid/ChevronDownIcon";
import { InsertDraggableElement } from "./InsertDraggableElement.tsx";

export type MiscElementsDropdownProps = {
  onClickedOption: (mode: ToolAddMode) => void;
};

export const MiscElementsDropdown = memo((props: MiscElementsDropdownProps) => {
  const missingIcon = (mode: ToolAddMode) => {
    return toolAddModesIcons[mode]?.length === 0;
  };

  return (
    <Menu as="div" className="ml-4 relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center rounded-md bg-white/20 px-4 py-2 text-sm text-black hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75">
          More elements
          <ChevronDownIcon
            className="-mr-1 ml-2 h-5 w-5 text-black/20 hover:text-myblack"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
          {toolAddModes.filter(missingIcon).map((mode, idx) => (
            <Menu.Item key={idx}>
              {({ active }) => (
                <button
                  onClick={() => props.onClickedOption(mode)}
                  className={`${
                    active ? "bg-mygreen/20 text-black" : "text-mydarkgrey"
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  <InsertDraggableElement el={mode} onClicked={props.onClickedOption}>
                    <span className="w-full">{toolAddModeTitles[mode]}</span>
                  </InsertDraggableElement>
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
});
