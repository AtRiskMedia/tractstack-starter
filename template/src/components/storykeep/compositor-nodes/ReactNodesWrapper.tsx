import { useStore } from "@nanostores/react";
import { scaleStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";
import { ViewportScaleWrapper } from "./ViewportScaleWrapper";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $scale = useStore(scaleStore);
  const scale = $scale.value / 100;

  return (
    <ViewportScaleWrapper>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale > 1 ? `${100 * scale}%` : "100%",
          minWidth: scale > 1 ? "fit-content" : "100%",
          maxWidth: "1920px",
          margin: "0 auto",
        }}
        className={props.bgColor}
      >
        <ReactNodesRenderer {...props} />
      </div>
    </ViewportScaleWrapper>
  );
};
