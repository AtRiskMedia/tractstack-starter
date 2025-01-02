import { useStore } from "@nanostores/react";
import { viewportStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $viewport = useStore(viewportStore);
  const viewportMaxWidth =
    $viewport.value === `mobile`
      ? 600
      : $viewport.value === `tablet`
        ? 1000
        : $viewport.value === `desktop`
          ? 1500
          : 1920;
  const viewportMinWidth =
    $viewport.value === `mobile` ? null : $viewport.value === `tablet` ? 801 : 1368;

  return (
    <div
      style={{
        ...(viewportMinWidth ? { minWidth: `${viewportMinWidth}px` } : {}),
        maxWidth: `${viewportMaxWidth}px`,
        margin: "0 auto",
      }}
      className={props.bgColor}
    >
      <ReactNodesRenderer {...props} />
    </div>
  );
};
