import { type NodeProps } from "@/components/storykeep/compositor-nodes/Node.tsx";
import { NodeAnchorComponent } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeAnchorComponent.tsx";

export const NodeButton = (props: NodeProps) => NodeAnchorComponent(props, "button");
