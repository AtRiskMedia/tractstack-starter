import { useEffect } from "react"; // Add this import
import CursorArrowRaysIcon from "@heroicons/react/24/outline/CursorArrowRaysIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
//import Square3Stack3DIcon from "@heroicons/react/24/outline/Square3Stack3DIcon";
import ArrowsUpDownIcon from "@heroicons/react/24/outline/ArrowsUpDownIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
//import PuzzlePieceIcon from "@heroicons/react/24/outline/PuzzlePieceIcon";
//import BoltIcon from "@heroicons/react/24/outline/BoltIcon";
import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "@/store/storykeep.ts";
import { getCtx } from "@/store/nodes.ts";
import type { ToolModeVal } from "@/types.ts";

export const toolModes = [
  {
    key: "default" as const,
    Icon: CursorArrowRaysIcon,
    title: "Text + styles",
  },
  {
    key: "text" as const,
    Icon: PencilIcon,
    title: "Write",
  },
  {
    key: "insert" as const,
    Icon: PlusIcon,
    title: "Add *",
  },
  {
    key: "eraser" as const,
    Icon: TrashIcon,
    title: "Eraser",
  },
  //{
  //  key: "pane" as const,
  //  Icon: Square3Stack3DIcon,
  //  title: "Insert Pane here",
  //},
  {
    key: "move" as const,
    Icon: ArrowsUpDownIcon,
    title: "Drag drop",
  },
  //{
  //  key: "layout" as const,
  //  Icon: PuzzlePieceIcon,
  //  title: "Auto-layout design",
  //},
  //{
  //  key: "markdown" as const,
  //  Icon: BoltIcon,
  //  title: "Edit plain text",
  //},
] as const;

const StoryKeepToolMode = ({ isContext }: { isContext: boolean }) => {
  const skipIfContextPane = [`pane`];
  const ctx = getCtx();
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const className =
    "w-8 h-8 py-1 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer";
  const classNameActive = "w-8 h-8 py-1.5 rounded-md bg-myblue text-white";
  const currentToolMode = toolModes.find((mode) => mode.key === toolModeVal) ?? toolModes[0];

  const handleClick = (mode: ToolModeVal) => {
    ctx.toolModeValStore.set({ value: mode });
    settingsPanelStore.set(null);
    ctx.notifyNode(`root`);
  };

  // Add escape key listener
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        ctx.toolModeValStore.set({ value: "default" });
        settingsPanelStore.set(null);
        ctx.notifyNode(`root`);
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  return (
    <>
      <div className="text-sm text-center font-bold h-16">mode:
      <div className="pt-1.5 text-xs text-center font-action">{currentToolMode.title}</div>
      </div>
      {toolModes
        .filter(({ key }) => (isContext ? !skipIfContextPane.includes(key) : true))
        .map(({ key, Icon, title }) =>
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
