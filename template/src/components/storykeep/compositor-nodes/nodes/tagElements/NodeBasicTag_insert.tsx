import { getCtx } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/storykeep/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { type JSX, useEffect, useState } from "react";
import { tagTitles } from "@/constants";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagInsert = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));

  const Tag = props.tagName;
  const tagTitle = tagTitles[props.tagName as keyof typeof tagTitles] || props.tagName;

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      console.log("notification received data update for node: " + nodeId);
      setChildren(getCtx(props).getChildNodeIDs(nodeId));
    });
    return unsubscribe;
  }, []);

  const handleInsertAbove = (e: React.MouseEvent) => {
    e.stopPropagation();
    getCtx(props).setClickedNodeId(nodeId);
    // Add your insert above logic here
  };

  const handleInsertBelow = (e: React.MouseEvent) => {
    e.stopPropagation();
    getCtx(props).setClickedNodeId(nodeId);
    // Add your insert below logic here
  };

  const InsertButtons = () => (
    <div className="absolute top-2 left-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
      <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-full font-medium">
        {tagTitle}
      </div>
      <button
        onClick={handleInsertAbove}
        className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white shadow-sm transition-colors font-medium"
      >
        + Above
      </button>
      <button
        onClick={handleInsertBelow}
        className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white shadow-sm transition-colors font-medium"
      >
        + Below
      </button>
    </div>
  );

  const baseComponent = (
    <div className="relative group">
      <div className="relative">
        <div className="absolute inset-0">
          <div className="h-full w-full outline outline-4 outline-dashed mix-blend-difference outline-cyan-600" />
        </div>
        <InsertButtons />
        <div className={`${getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)} pt-12`}>
          <RenderChildren children={children} nodeProps={props} />
        </div>
      </div>
    </div>
  );

  // When showGuids is true, we just return the base component
  if (showGuids.get()) return baseComponent;

  // When showGuids is false, we wrap the content in the specified tag
  return (
    <div className="relative group">
      <div className="relative">
        <div className="absolute inset-0">
          <div className="h-full w-full outline outline-4 outline-dashed mix-blend-difference outline-cyan-600" />
        </div>
        <InsertButtons />
        <Tag className={`${getCtx(props).getNodeClasses(nodeId, viewportStore.get().value)} pt-12`}>
          <RenderChildren children={children} nodeProps={props} />
        </Tag>
      </div>
    </div>
  );
};
