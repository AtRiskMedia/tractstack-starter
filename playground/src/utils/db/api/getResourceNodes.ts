import { getResourcesByCategorySlugRowData, getResourcesBySlugsRowData } from "../turso";
import type { ResourceNode } from "@/types";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { LoadData } from "@/store/nodesSerializer";
import type { APIContext } from "@/types";

export async function getResourceNodes(
  params: {
    slugs?: string[];
    categories?: string[];
  },
  context?: APIContext
): Promise<ResourceNode[]> {
  try {
    const { slugs, categories } = params;
    let resourceNodes: ResourceNode[] = [];
    const deserializer = new NodesDeserializer_Json();
    const loadData: LoadData = {};

    if (slugs && slugs.length > 0) {
      const resourceRowData = await getResourcesBySlugsRowData(slugs, context);
      resourceRowData.forEach((resource) => {
        deserializer.processResourceRowData(resource, loadData);
      });
    }

    if (categories && categories.length > 0) {
      for (const category of categories) {
        const categoryResourceRowData = await getResourcesByCategorySlugRowData(category, context);
        categoryResourceRowData.forEach((resource) => {
          deserializer.processResourceRowData(resource, loadData);
        });
      }
    }

    if (loadData.resourceNodes) {
      resourceNodes = Object.values(loadData.resourceNodes);
    }

    return resourceNodes;
  } catch (error) {
    console.error("Error in getResourceNodes:", error);
    throw error;
  }
}
