import type { NodeProps } from "@/components/compositor-nodes/Node.tsx";
import { getCtx } from "@/store/nodes.ts";
import type { FlatNode } from "@/types.ts";

export const NodeText = (props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const parentNode = node.parentId
    ? (getCtx(props).allNodes.get().get(node.parentId) as FlatNode)
    : null;
  const isLink = parentNode && [`a`, `button`].includes(parentNode.tagName);
  if (!node) return <>ERROR MISSING NODE</>;

  // Only add a space if we're not empty and don't end with a space
  const text = node.copy || "";
  const needsSpace = text && !text.endsWith(" ") && !isLink;

  return <>{text.trim() === "" ? "\u00A0" : text + (needsSpace ? " " : "")}</>;
};
