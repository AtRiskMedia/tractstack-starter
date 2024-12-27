/* eslint-disable @typescript-eslint/no-explicit-any */
import { ulid } from "ulid";
import { processButtonPayload } from "./buttonPayload";
import { cleanText } from "./cleanText";
import type { Root, Element, RootContent, Text } from "hast";
import type { FlatNode, FileNode, Tuple, OptionsPayloadDatum } from "../../../types";

// Update MdxNode to be a union type that matches HAST types
type MdxNode = Root | Element | Text | RootContent;

const TRACKED_ELEMENTS = ["p", "h2", "h3", "h4", "h5", "code", "img", "ul", "ol", "li"];
const regexpHook = /(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*?)\)/;

type Breakpoint = "mobile" | "tablet" | "desktop";
type ResponsiveStyles = Partial<Record<Breakpoint, Record<string, string>>>;

function parseHookParams(paramsStr: string): (string | string[])[] {
  const sections = paramsStr.split("|").map((section) => section.trim());
  return sections.map((section) => {
    if (section.includes(",")) {
      return section.split(",").map((item) => item.trim());
    }
    return section;
  });
}

function resolveResponsiveStylesAtIndex(
  styles: { [key: string]: (Tuple | null)[] },
  idx: number
): ResponsiveStyles {
  const result: ResponsiveStyles = {};
  const breakpoints: Breakpoint[] = ["mobile", "tablet", "desktop"];

  Object.entries(styles).forEach(([key, tupleArrays]) => {
    // Skip if no override array at this index
    if (!tupleArrays || !tupleArrays[idx]) return;

    const tuple = tupleArrays[idx];
    if (!tuple) return;

    tuple.forEach((value, breakpointIdx) => {
      const breakpoint = breakpoints[breakpointIdx];
      if (!breakpoint || value == null) return;

      // Skip if same as previous breakpoint to match flattening logic
      if (breakpointIdx > 0 && value === tuple[breakpointIdx - 1]) return;

      if (!result[breakpoint]) result[breakpoint] = {};
      result[breakpoint]![key] = String(value);
    });
  });

  return result;
}

export function mdAstTraverse(
  node: MdxNode,
  parentId: string | null = null,
  fileNodes: FileNode[],
  optionsPayload: OptionsPayloadDatum,
  elementCounts: Record<string, number> = {},
  slug: string,
  isContext: boolean
): FlatNode[] {
  const results: FlatNode[] = [];

  // Initialize counts if first run
  if (Object.keys(elementCounts).length === 0) {
    TRACKED_ELEMENTS.forEach((tag) => {
      elementCounts[tag] = 0;
    });
  }

  // Phase 1: Handle text nodes
  if (node.type === "text") {
    let codeHookParams = null;
    const hookMatch = node.value?.match(regexpHook);

    if (hookMatch && typeof hookMatch[2] === "string") {
      codeHookParams = parseHookParams(hookMatch[2]);
    }

    results.push({
      id: ulid(),
      nodeType: "TagElement",
      parentId,
      tagName: "text",
      copy: cleanText(node.value || ``),
      ...(codeHookParams ? { codeHookParams } : {}),
    });
    return results;
  }

  // Handle element nodes
  if (node.type === "element" && "tagName" in node) {
    const currentNodeId = ulid();
    let overrideClasses = null;
    let elementCss = null;

    // Handle tracked elements and their overrides and default CSS
    if (TRACKED_ELEMENTS.includes(node.tagName)) {
      // Handle overrides
      const override = optionsPayload?.classNamesPayload?.[node.tagName]?.override;
      if (override) {
        overrideClasses = resolveResponsiveStylesAtIndex(override, elementCounts[node.tagName]);
      }

      // Handle default CSS for elements
      const defaultClasses = optionsPayload?.classNames?.all?.[node.tagName];
      if (defaultClasses && Array.isArray(defaultClasses) && defaultClasses.length > 1) {
        // If there are multiple default classes, use the one corresponding to this element's count
        const idx = elementCounts[node.tagName] % defaultClasses.length;
        elementCss = defaultClasses[idx];
      }

      elementCounts[node.tagName]++;
    }

    // Phase 2: Special handling for code elements
    if (node.tagName === "code" && node.children) {
      const textNode = node.children.find((child): child is Text => child.type === "text");
      if (textNode) {
        let codeHookParams = null;
        const hookMatch = textNode.value?.match(regexpHook);

        if (hookMatch && typeof hookMatch[2] === "string") {
          codeHookParams = parseHookParams(hookMatch[2]);
        }

        results.push({
          nodeType: "TagElement",
          id: currentNodeId,
          parentId,
          tagName: "code",
          copy: textNode.value,
          ...(codeHookParams ? { codeHookParams } : {}),
          ...(overrideClasses ? { overrideClasses } : {}),
          ...(elementCss ? { elementCss } : {}),
        });
        return results;
      }
    }

    // Create the flat node for non-code elements
    const flatNode: FlatNode = {
      id: currentNodeId,
      nodeType: "TagElement",
      parentId,
      tagName: node.tagName,
      ...(overrideClasses && Object.keys(overrideClasses).length ? { overrideClasses } : {}),
      ...(elementCss ? { elementCss } : {}),
    };

    // Handle node properties
    if ("properties" in node) {
      switch (node.tagName) {
        case "img": {
          const imgSrc = node.properties?.src as string;
          const matchingFile = fileNodes.find((file) => file.filename === imgSrc);
          if (matchingFile) {
            flatNode.src = matchingFile.url;
            flatNode.alt =
              (node.properties?.alt as string) ||
              matchingFile.altDescription ||
              `Image description could not be found. We apologize`;
          } else {
            flatNode.src = imgSrc;
            flatNode.alt = node.properties?.alt as string;
          }
          break;
        }
        case "a":
          if (typeof node.properties?.href === "string") {
            flatNode.href = node.properties.href;
            if (typeof optionsPayload?.buttons?.[node.properties.href] === "object") {
              const processedButton = processButtonPayload(
                flatNode,
                optionsPayload?.buttons?.[node.properties.href],
                slug,
                isContext
              );
              Object.assign(flatNode, processedButton);
              if (processedButton.tagName === `button` && flatNode.href) delete flatNode.href;
            }
          }
          break;
      }
    }

    results.push(flatNode);

    // Recurse through children (except for code elements)
    if ("children" in node && Array.isArray(node.children) && node.tagName !== "code") {
      node.children.forEach((child) => {
        const childNodes = mdAstTraverse(
          child,
          currentNodeId,
          fileNodes,
          optionsPayload,
          elementCounts,
          slug,
          isContext
        );
        results.push(...childNodes);
      });
    }
  }

  // Handle root nodes
  if (node.type === "root" && "children" in node) {
    node.children.forEach((child) => {
      const childNodes = mdAstTraverse(
        child,
        null,
        fileNodes,
        optionsPayload,
        elementCounts,
        slug,
        isContext
      );
      results.push(...childNodes);
    });
  }

  return results;
}
