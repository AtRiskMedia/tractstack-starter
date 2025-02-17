import { getTractStackByIdRowData } from "../turso";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { TractStackNode } from "@/types";
import type { LoadData } from "@/store/nodesSerializer";

export async function getTractStackNode(id: string): Promise<TractStackNode | null> {
  const tractstackRowData = await getTractStackByIdRowData(id);
  if (!tractstackRowData) {
    return null;
  }
  const deserializer = new NodesDeserializer_Json();
  const loadData: LoadData = {};
  deserializer.processTractStackRowData(tractstackRowData, loadData);
  return loadData?.tractstackNodes?.at(0) || null;
}
