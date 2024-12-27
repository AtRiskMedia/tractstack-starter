import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs, getNodeClasses } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";
import type {JSX} from 'react'

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTag = ({ tagName, nodeId }: NodeTagProps)=> {
  const Tag = tagName;
  return (
    <Tag className={getNodeClasses(nodeId, viewportStore.get().value)}>
      {getChildNodeIDs(nodeId).map((id: string) => (
        <Node nodeId={id} key={id} />
      ))}
    </Tag>
  );
}