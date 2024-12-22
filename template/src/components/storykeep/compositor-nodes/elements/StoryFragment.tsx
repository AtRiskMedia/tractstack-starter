import { Node, type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { getChildNodeIDs } from "@/store/nodes.ts";

export const StoryFragment = (props: NodeProps) => {
  return (
    <div className="flex flex-col h-full p-10 bg-purple-400">
      <span>
        Story Fragment <b>{props.id}</b>
      </span>
      {getChildNodeIDs(props.id).map((id: string) => (
        <Node id={id} key={id} />
      ))}
    </div>
  );
}