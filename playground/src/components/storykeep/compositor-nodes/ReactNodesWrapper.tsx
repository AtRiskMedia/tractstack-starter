import { useStore } from "@nanostores/react";
import { viewportKeyStore } from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $viewportKey = useStore(viewportKeyStore);
  const viewportMaxWidth =
    $viewportKey.value === `mobile` ? 600 : $viewportKey.value === `tablet` ? 1000 : 1500;
  const viewportMinWidth =
    $viewportKey.value === `mobile` ? null : $viewportKey.value === `tablet` ? 801 : 1368;

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
