import { getAllBeliefRowData } from "../turso";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { BeliefNode } from "@/types";
import type { LoadData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function getAllBeliefNodes(context?: APIContext): Promise<BeliefNode[]> {
  const beliefRowData = await getAllBeliefRowData(context);
  if (!beliefRowData?.length) {
    return [createKnownLeadBelief()];
  }

  const deserializer = new NodesDeserializer_Json();
  const loadData: LoadData = {};
  beliefRowData.forEach((belief) => {
    deserializer.processBeliefRowData(belief, loadData);
  });

  const beliefs = loadData.beliefNodes || [];
  const hasKnownLead = beliefs.some((belief) => belief.slug === "KnownLead");
  if (!hasKnownLead) {
    beliefs.push(createKnownLeadBelief());
  }

  return beliefs;
}

function createKnownLeadBelief(): BeliefNode {
  return {
    id: "KnownLead",
    nodeType: "Belief",
    parentId: null,
    title: "Known Lead",
    slug: "KnownLead",
    scale: "yn",
    isChanged: false,
  };
}
