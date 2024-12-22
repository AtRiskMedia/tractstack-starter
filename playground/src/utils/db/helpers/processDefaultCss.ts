import type { ClassNamesPayloadValue } from "../../../types";

interface ProcessedClassDef {
  [key: string]: string;
}

export function processDefaultCss(
  classes: Record<string, ClassNamesPayloadValue | string | string[]>
): ProcessedClassDef {
  const processed: ProcessedClassDef = {};

  for (const [tag, classValue] of Object.entries(classes)) {
    // Skip if no classes defined
    if (!classValue) continue;

    // If it's an array and has only one item, use that
    if (Array.isArray(classValue) && classValue.length === 1) {
      processed[tag] = classValue[0];
    }
    // If it's a string, use it directly
    else if (typeof classValue === "string") {
      processed[tag] = classValue;
    }
    // Skip if multiple values as it has no single default
  }

  return processed;
}
