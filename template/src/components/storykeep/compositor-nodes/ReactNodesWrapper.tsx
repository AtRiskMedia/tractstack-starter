import { useStore } from "@nanostores/react";
import { scaleStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $scale = useStore(scaleStore);
  const scale = $scale.value / 100;

  return (
    <div className="relative w-full overflow-x-auto min-h-screen max-w-[1920px]">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale > 1 ? `${100 * scale}%` : "100%",
          minWidth: scale > 1 ? "fit-content" : "100%",
        }}
        className={props.bgColor}
      >
        <ReactNodesRenderer {...props} />
      </div>
    </div>
  );
};
