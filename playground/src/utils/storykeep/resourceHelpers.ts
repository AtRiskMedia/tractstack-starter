/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ResourceSetting } from "@/types";

import knownResourcesRaw from "../../../config/knownResources.json";

// Type assertion to narrow string to specific literals
const knownResources = knownResourcesRaw as {
  [K: string]: {
    [P: string]: {
      type: "string" | "boolean" | "number" | "date";
      defaultValue?: any;
    };
  };
};

export function isKnownResourceSetting(
  categorySlug: string | number
): categorySlug is keyof typeof knownResources {
  return typeof categorySlug === "string" && categorySlug in knownResources;
}

export function getResourceSetting(categorySlug: string | number): ResourceSetting | undefined {
  return isKnownResourceSetting(categorySlug) ? knownResources[categorySlug] : undefined;
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
