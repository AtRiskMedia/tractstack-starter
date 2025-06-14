import type { ResourceNode } from "@/types";

export interface ExtractedResources {
  [category: string]: ResourceNode[];
}

/**
 * Groups resources by their category
 * @param resources - Array of ResourceNode objects
 * @returns Object with category keys containing arrays of resources
 */
export function extractResources(resources: ResourceNode[]): ExtractedResources {
  return resources.reduce((acc: ExtractedResources, resource) => {
    const category = resource.category || "uncategorized";

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(resource);

    return acc;
  }, {});
}
