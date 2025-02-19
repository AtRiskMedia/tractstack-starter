import { type NodeProps } from "@/types";
import { NodeAnchorComponent } from "@/components/compositor-nodes/nodes/tagElements/NodeAnchorComponent.tsx";

export const NodeA = (props: NodeProps) => NodeAnchorComponent(props, "a");
