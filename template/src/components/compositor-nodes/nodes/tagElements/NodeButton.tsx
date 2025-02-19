import type { NodeProps } from "@/types"
import { NodeAnchorComponent } from "@/components/compositor-nodes/nodes/tagElements/NodeAnchorComponent.tsx";

export const NodeButton = (props: NodeProps) => NodeAnchorComponent(props, "button");
