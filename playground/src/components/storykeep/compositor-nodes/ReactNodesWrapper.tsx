import { useStore } from "@nanostores/react";
import { viewportStore, scaleStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";
import { ViewportScaleWrapper } from "./ViewportScaleWrapper";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $scale = useStore(scaleStore);
  const scale = $scale.value / 100;
  const $viewport = useStore(viewportStore);
  const viewportWidth =
    $viewport.value === `mobile` ? 800 : $viewport.value === `tablet` ? 1080 : 1920;

  return (
    <ViewportScaleWrapper>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale > 1 ? `${100 * scale}%` : "100%",
          maxWidth: `${viewportWidth}px`,
          margin: "0 auto",
        }}
        className={props.bgColor}
      >
        <ReactNodesRenderer {...props} />
      </div>
    </ViewportScaleWrapper>
  );
};
