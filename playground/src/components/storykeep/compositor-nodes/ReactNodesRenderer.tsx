import { getCtx } from "@/store/nodes.ts";
import { useEffect, useState } from "react";
import type { StoryKeepAllNodes } from "@/types.ts";
import { TemplateSimplePane } from "@/utils/TemplatePanes.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";

export type ReactNodesRendererProps = {
  nodes: StoryKeepAllNodes | null;
  id: string;
  bgColor: string;
};

export const ReactNodesRenderer = (props: ReactNodesRendererProps) => {
  const [rootId, setRootId] = useState<string>("");

  useEffect(() => {
    getCtx().buildNodesTreeFromFragmentNodes(props.nodes);
    if (props.id !== getCtx().rootNodeId.get()) {
      setRootId(props.id);
    }
    setRootId(props.id || getCtx().rootNodeId.get());
  }, []);

  return (
    <>
      {rootId.length > 0 ? <Node nodeId={rootId} /> : <></>}
      <>
        <div className="flex gap-x-2">
          <button
            className="bg-cyan-500 rounded-md p-2"
            onClick={() => {
              const storyFragment = getCtx()
                .allNodes.get()
                .values()
                .find((x) => x.nodeType === "StoryFragment");
              if (storyFragment && storyFragment.id !== null) {
                getCtx().addTemplatePane(storyFragment.id, TemplateSimplePane);
              }
            }}
          >
            Add Pane
          </button>
        </div>
      </>
    </>
  );
};
