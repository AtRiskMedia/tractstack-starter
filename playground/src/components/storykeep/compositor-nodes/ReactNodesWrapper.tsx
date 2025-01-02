import { useStore } from "@nanostores/react";
import {viewportStore} from "@/store/storykeep";
import { ReactNodesRenderer, type ReactNodesRendererProps } from "./ReactNodesRenderer";

export const ReactNodesWrapper = (props: ReactNodesRendererProps) => {
  const $viewport= useStore(viewportStore);
  console.log($viewport.value)
 const viewportMaxWidth =
    $viewport.value === `mobile` ? 600 : $viewport.value === `tablet` ? 801 : 
$viewport.value === `desktop` ? 1400 :
      1920;

  return (
    <div
      style={{
        maxWidth: `${viewportMaxWidth}px`,
        margin: "0 auto",
      }}
      className={props.bgColor}
    >
      <ReactNodesRenderer {...props} />
    </div>
  );
};
