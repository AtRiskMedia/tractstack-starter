import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses, setClickedNode } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type {JSX} from 'react'

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = ({ tagName, nodeId }: NodeTagProps)=> {
  const Tag = tagName;
  console.log("BasicTag render");

  return (
    <div className={getNodeClasses(nodeId, viewportStore.get().value)}
         onMouseDown={() => console.log("onMouseDown")}>
      {getChildNodeIDs(nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </div>
  );
}