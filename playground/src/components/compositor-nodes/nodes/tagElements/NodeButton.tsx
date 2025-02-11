import { type NodeProps } from "@/components/compositor-nodes/Node.tsx";
import { NodeAnchorComponent } from "@/components/compositor-nodes/nodes/tagElements/NodeAnchorComponent.tsx";

export const NodeButton = (props: NodeProps) => NodeAnchorComponent(props, "button");
