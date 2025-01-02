import type { BaseNode } from "@/types.ts";

export function handleClickEvent(node: BaseNode) {
  console.log(`we got:`, node);
  return true;
}
