import { useEffect } from "react"; // Add this import
import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes.ts";
import { storykeepToolModes } from "@/constants";
import type { ToolModeVal } from "@/types";

const StoryKeepToolMode = ({ isContext }: { isContext: boolean }) => {
  const skipIfContextPane = [`pane`];
  const ctx = getCtx();
  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const className =
    "w-8 h-8 py-1 rounded-xl bg-white text-myblue hover:bg-mygreen/20 hover:text-black hover:rotate-3 cursor-pointer";
  const classNameActive = "w-8 h-8 py-1.5 rounded-md bg-myblue text-white";
  const currentToolMode =
    storykeepToolModes.find((mode) => mode.key === toolModeVal) ?? storykeepToolModes[0];

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

  if (!hasTitle || !hasPanes) return null;
  return (
    <>
      <div className="text-sm text-center font-bold h-16 text-mydarkgrey">
        mode:
        <div className="pt-1.5 text-xs text-center font-action text-myblue">
          {currentToolMode.title}
        </div>
      </div>
      {storykeepToolModes
        .filter(({ key }) => (isContext ? !skipIfContextPane.includes(key) : true))
        .map(({ key, Icon, description }) => (
          <div title={description} key={key}>
            {key === toolModeVal ? (
              <Icon className={classNameActive} />
            ) : (
              <Icon className={className} onClick={() => handleClick(key)} />
            )}
          </div>
        ))}
    </>
  );
};

export default StoryKeepToolMode;
