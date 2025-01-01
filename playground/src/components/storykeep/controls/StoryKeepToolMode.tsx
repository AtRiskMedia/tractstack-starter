import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import Square3Stack3DIcon from "@heroicons/react/24/outline/Square3Stack3DIcon";
import Cog8ToothIcon from "@heroicons/react/24/outline/Cog8ToothIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import PuzzlePieceIcon from "@heroicons/react/24/outline/PuzzlePieceIcon";
import BoltIcon from "@heroicons/react/24/outline/BoltIcon";
import { useStore } from "@nanostores/react";
import { toolModeValStore } from "../../../store/storykeep";
import type { ToolModeVal } from "../../../types";

export const toolModes = [
  {
    key: "default" as const,
    Icon: CursorArrowRaysIcon,
    title: "Edit text/styles",
  },
  {
    key: "insert" as const,
    Icon: PlusIcon,
    title: "Add element",
  },
  {
    key: "eraser" as const,
    Icon: TrashIcon,
    title: "Erase element",
  },
  {
    key: "pane" as const,
    Icon: Square3Stack3DIcon,
    title: "Insert Pane",
  },
  {
    key: "settings" as const,
    Icon: Cog8ToothIcon,
    title: "Edit settings",
  },
  {
    key: "layout" as const,
    Icon: PuzzlePieceIcon,
    title: "Auto-layout design",
  },
  {
    key: "markdown" as const,
    Icon: BoltIcon,
    title: "Edit plain text",
  },
] as const;

const StoryKeepToolMode = () => {
  const { value: toolModeVal } = useStore(toolModeValStore);
  const className =
    "w-8 h-8 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer";
  const classNameActive = "w-8 h-8 rounded-md bg-myblue text-white";

  const handleClick = (mode: ToolModeVal) => {
    toolModeValStore.set({ value: mode });
  };

  return (
    <>
      {toolModes.map(({ key, Icon, title }) =>
        key === toolModeVal ? (
          <Icon key={key} title={title} className={classNameActive} />
        ) : (
          <Icon key={key} title={title} className={className} onClick={() => handleClick(key)} />
        )
      )}
    </>
  );
};

export default StoryKeepToolMode;
