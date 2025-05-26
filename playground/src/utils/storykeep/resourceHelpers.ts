/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResourceSetting } from "@/types";

let cachedKnownResources: { [K: string]: ResourceSetting } | null = null;

export async function getKnownResources(): Promise<{ [K: string]: ResourceSetting }> {
  if (cachedKnownResources) {
    return cachedKnownResources;
  }

  try {
    const response = await fetch("/api/fs/getKnownResources");
    const result = await response.json();

    if (result.success && result.data) {
      cachedKnownResources = result.data;
      return result.data;
    }

    return {};
  } catch (error) {
    console.error("Error fetching known resources:", error);
    return {};
  }
}

export async function updateKnownResource(
  categorySlug: string,
  resourceDefinition: ResourceSetting
): Promise<boolean> {
  try {
    const response = await fetch("/api/fs/updateKnownResource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug, resourceDefinition }),
    });

    const result = await response.json();

    if (result.success) {
      // Clear cache to force reload on next access
      cachedKnownResources = null;
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error updating known resource:", error);
    return false;
  }
}

export async function isKnownResourceSetting(categorySlug: string | number): Promise<boolean> {
  if (typeof categorySlug !== "string") return false;

  const knownResources = await getKnownResources();
  return categorySlug in knownResources;
}

export async function getResourceSetting(
  categorySlug: string | number
): Promise<ResourceSetting | undefined> {
  if (typeof categorySlug !== "string") return undefined;

  const knownResources = await getKnownResources();
  return knownResources[categorySlug];
}

export function processResourceValue(key: string, value: any, setting: ResourceSetting): any {
  if (key in setting) {
    const { type, defaultValue } = setting[key];
    switch (type) {
      case "string":
        return typeof value === "string" ? value : (defaultValue ?? "");
      case "boolean":
        return typeof value === "boolean" ? value : (defaultValue ?? false);
      case "number":
        return typeof value === "number" ? value : (defaultValue ?? 0);
      //case "date":
      //  return typeof value === "number"
      //    ? new Date(value * 1000).toISOString()
      //    : (defaultValue ?? "");
      default:
        return value;
    }
  }
  return value;
}

// Clear cache function for manual cache invalidation if needed
export function clearKnownResourcesCache(): void {
  cachedKnownResources = null;
}
