import { getResourcesByCategorySlugRowData, getResourcesBySlugsRowData } from "../turso";
import type { ResourceNode } from "@/types";
import { NodesDeserializer_Json } from "@/store/nodesDeserializer_Json";
import type { LoadData } from "@/store/nodesSerializer";

export async function getResourceNodes(params: {
  slugs?: string[];
  categories?: string[];
}): Promise<ResourceNode[]> {
  try {
    const { slugs, categories } = params;
    let resourceNodes: ResourceNode[] = [];
    const deserializer = new NodesDeserializer_Json();
    const loadData: LoadData = {};

    // Get resources by slugs if provided
    if (slugs && slugs.length > 0) {
      const resourceRowData = await getResourcesBySlugsRowData(slugs);
      resourceRowData.forEach((resource) => {
        deserializer.processResourceRowData(resource, loadData);
      });
    }

    // Get resources by categories if provided
    if (categories && categories.length > 0) {
      for (const category of categories) {
        const categoryResourceRowData = await getResourcesByCategorySlugRowData(category);
        categoryResourceRowData.forEach((resource) => {
          deserializer.processResourceRowData(resource, loadData);
        });
      }
    }

    // Convert loadData.resourceNodes to array if it exists
    if (loadData.resourceNodes) {
      resourceNodes = Object.values(loadData.resourceNodes);
    }

    return resourceNodes;
  } catch (error) {
    console.error("Error in getResourceNodes:", error);
    throw error;
  }
}
