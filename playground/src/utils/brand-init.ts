import { getPreviewModeValue, previewMode } from "../store/storykeep";
import { getEnvValue } from "./preview-brand";
import { knownBrand } from "../constants";

export function initializeBrandColors(): void {
  if (typeof window === "undefined") return;

  const previewModeActive = getPreviewModeValue(previewMode.get());
  const brandString = previewModeActive
    ? getEnvValue("PUBLIC_BRAND")
    : import.meta.env.PUBLIC_BRAND || knownBrand.default;

  const brandColors = brandString.split(",").map((color: string) => `#${color.trim()}`);

  brandColors.forEach((color: string, index: number) => {
    document.documentElement.style.setProperty(`--brand-${index + 1}`, color);
  });
}
