import { atom } from "nanostores";
import type { BaseNode } from "@/types.ts";

export const allNodes = atom<Map<string, BaseNode>>(new Map<string, BaseNode>());
export const parentNodes = atom<Map<string, string[]>>(new Map<string, string[]>());
export const rootNodeId = atom<string>("");

export const getChildNodeIDs = (parentNodeId: string): string[] => {
  return Array.from(parentNodes.get()?.get(parentNodeId) || []);
}

export const addNode = (data: BaseNode) => {
  allNodes.get().set(data.id, data);

  // root node
  if(data.parentId === null && rootNodeId.get().length === 0) {
    rootNodeId.set(data.id);
  } else {
    const parentNode = parentNodes.get();
    if (data.parentId !== null && parentNode) {
      if (parentNode.has(data.parentId)) {
        parentNode.get(data.parentId)?.unshift(data.id);
        parentNodes.set(new Map<string, string[]>(parentNode));
      } else {
        parentNode.set(data.parentId, [data.id]);
      }
    }
  }
}

export const addNodes = (nodes: BaseNode[]) => {
  for (const node of nodes) {
    addNode(node);
  }
}