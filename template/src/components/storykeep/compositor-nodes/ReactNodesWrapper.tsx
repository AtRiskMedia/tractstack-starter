import { useStore } from "@nanostores/react";
import { viewportStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $viewport = useStore(viewportStore);
  const viewportWidth =
    $viewport.value === `mobile` ? 600 : $viewport.value === `tablet` ? 1024 : 1400;
  const viewportMaxWidth =
    $viewport.value === `mobile` ? 800 : $viewport.value === `tablet` ? 1080 : 1920;
  const viewportMinWidth =
    $viewport.value === `mobile` ? null : $viewport.value === `tablet` ? 801 : 1368;

  return (
    <div
      style={{
        ...(viewportMinWidth ? { minWidth: `${viewportMinWidth}px` } : {}),
        width: `${viewportWidth}px`,
        maxWidth: `${viewportMaxWidth}px`,
        margin: "0 auto",
      }}
      className={props.bgColor}
    >
      <ReactNodesRenderer {...props} />
    </div>
  );
};
