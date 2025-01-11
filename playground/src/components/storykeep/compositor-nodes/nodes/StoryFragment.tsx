import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportStore, showSettings } from "@/store/storykeep.ts";
import StoryFragmentConfigPanel from "../../controls/storyfragment/StoryFragmentConfigPanel";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";

export const StoryFragment = (props: NodeProps) => {
  const showSettingsVal = showSettings.get();
  const [children, setChildren] = useState<string[]>([
    ...getCtx(props).getChildNodeIDs(props.nodeId),
  ]);

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {
      console.log("notification received data update for storyfragment node: " + props.nodeId);
      setChildren([...getCtx(props).getChildNodeIDs(props.nodeId)]);
    });
    return unsubscribe;
  }, []);

  const closePanel = () => {
    showSettings.set(false);
    getCtx().notifyNode(`root`);
  };

  return (
    <>
      {showSettingsVal ? (
        <div className="p-2.5 bg-white rounded-md">
          <div className="p-1.5 flex flex-row flex-nowrap justify-between">
            <h2 className="font-action font-bold text-sm">Advanced Settings</h2>
            <button onClick={() => closePanel()} className="text-myblue hover:text-black underline">
              Edit Page
            </button>
          </div>
          <StoryFragmentConfigPanel nodeId={props.nodeId} />
        </div>
      ) : (
        <div
          className={getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value)}
          style={getCtx(props).getNodeCSSPropertiesStyles(props.nodeId, viewportStore.get().value)}
        >
          <RenderChildren children={children} nodeProps={props} />
        </div>
      )}
    </>
  );
};
