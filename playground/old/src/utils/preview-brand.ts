import { persistentAtom } from "@nanostores/persistent";
import { previewMode, getPreviewModeValue } from "../store/storykeep";
import { knownBrand } from "../constants";

export const previewBrand = persistentAtom<string>("preview-brand", knownBrand.default);
export const previewBrandConfigured = persistentAtom<string>("preview-brand-configured", "false");

export function getEnvValue(key: "PUBLIC_BRAND"): string {
  if (typeof window === "undefined" || !getPreviewModeValue(previewMode.get())) {
    return import.meta.env[key] || knownBrand.default;
  }
  return previewBrand.get();
}

export function setEnvValue(value: string): void {
  if (typeof window === "undefined" || !getPreviewModeValue(previewMode.get())) {
    return;
  }
  previewBrand.set(value);
}
