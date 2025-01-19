import { getAllBeliefRowData } from "../turso";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { BeliefNode } from "@/types";
import type { LoadData } from "@/store/nodesSerializer";

export async function getAllBeliefNodes(): Promise<BeliefNode[]> {
  const beliefRowData = await getAllBeliefRowData();
  if (!beliefRowData?.length) {
    return [];
  }
  const deserializer = new NodesDeserializer_Json();
  const loadData: LoadData = {};
  beliefRowData.forEach((belief) => {
    deserializer.processBeliefRowData(belief, loadData);
  });
  return loadData.beliefNodes || [];
}
