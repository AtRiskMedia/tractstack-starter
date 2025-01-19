import { getImage } from "astro:assets";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ClassNamesPayloadValue,
  FileNode,
  GraphNode,
  GraphNodeDatum,
  GraphNodes,
  GraphRelationshipDatum,
  MarkdownLookup,
  TursoFileNode,
  TupleValue,
} from "../../types";
import { type DragNode, Location } from "@/store/storykeep.ts";
import { toHast } from "mdast-util-to-hast";
import type { Root as HastRoot, RootContent } from "hast";

export const getComputedColor = (color: string): string => {
  if (color === `#` || typeof color === `undefined`) return `#ffffff`;
  if (color.startsWith("#var(--")) {
    color = color.slice(1);
  }
  if (color.startsWith("var(--")) {
    const varName = color.slice(4, -1);
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue(varName).trim() || color;
  }
  return color;
};

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(` `);
}

export function getClassNames(input: string | { classes: ClassNamesPayloadValue }): string[] {
  if (!input) {
    return [];
  }
  if (typeof input === "string") {
    return [input];
  } else {
    return Object.values(input.classes).flat();
  }
}

function getScrollBarWidth() {
  // Create a temporary element to measure the scrollbar width
  const div = document.createElement("div");
  div.style.overflow = "scroll";
  div.style.width = "100px";
  div.style.height = "100px";
  div.style.position = "absolute";
  div.style.top = "-9999px"; // Move it out of the viewport
  document.body.appendChild(div);

  // Create an inner element to measure the difference
  const innerDiv = document.createElement("div");
  innerDiv.style.width = "100%";
  innerDiv.style.height = "100%";
  div.appendChild(innerDiv);

  // Calculate the scrollbar width
  const scrollBarWidth = div.offsetWidth - innerDiv.offsetWidth;

  // Clean up
  document.body.removeChild(div);

  return scrollBarWidth;
}

export function handleResize() {
  const scrollBarWidth = getScrollBarWidth();
  const innerWidth = window.innerWidth;
  //console.log(`innerWidth`, innerWidth);
  const thisScale =
    innerWidth < 801
      ? (innerWidth - scrollBarWidth) / 600
      : innerWidth < 1367
        ? (innerWidth - scrollBarWidth) / 1080
        : (innerWidth - scrollBarWidth) / 1920;
  document.documentElement.style.setProperty(`--scale`, thisScale.toString());
}

export function handleEditorResize() {
  const previewElement = document.getElementById("storykeep-preview");
  if (!previewElement) return;

  const resizeObserver = new ResizeObserver(() => {
    // Calculate scrollbar width
    const scrollBarOffset = window.innerWidth - document.documentElement.clientWidth;
    // Get the actual width of the preview element
    const previewWidth = previewElement.clientWidth;
    // Adjust the width to account for the scrollbar
    const adjustedWidth =
      previewWidth + scrollBarOffset * (window.innerWidth > previewWidth + scrollBarOffset ? 0 : 1);
    let baseWidth;
    // Use adjustedWidth for breakpoint checks
    if (adjustedWidth <= 800) {
      baseWidth = 600;
    } else if (adjustedWidth <= 1367) {
      baseWidth = 1080;
    } else {
      baseWidth = 1920;
    }
    // Use the actual previewWidth for scale calculation
    const thisScale = previewWidth / baseWidth;
    previewElement.style.setProperty(`--scale`, thisScale.toString());
  });
  resizeObserver.observe(previewElement);
  // Clean up function
  return () => {
    resizeObserver.disconnect();
  };
}

export function scrollToTop() {
  const button = document.querySelector("button#top");
  button?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: `smooth`,
    });
  });
}

export function handleScroll() {
  const rootElement = document.documentElement;
  const button = document.querySelector("button#top");
  //const scrollTotal = rootElement.scrollHeight - rootElement.clientHeight;
  const aboveFold = window.innerHeight > rootElement.scrollTop;
  //const hitBottom = scrollTotal - rootElement.scrollTop < 150;
  if (!aboveFold /* && !hitBottom */ && button) {
    // Show button
    button.classList.add("block");
    button.classList.remove("hidden");
  } else if (button) {
    // Hide button
    button.classList.add("hidden");
    button.classList.remove("block");
  }
}

export const processGraphPayload = (rows: GraphNodes[]) => {
  const graphNodes: GraphNode[] = [];
  const graphNodeIds: string[] = [];
  const graphRelationships: GraphNode[] = [];
  const graphRelationshipIds: string[] = [];
  rows.forEach((row: GraphNodes) => {
    if (row?.v?.id && !graphNodeIds.includes(row.v.id)) {
      graphNodes.push(row.v);
      graphNodeIds.push(row.v.id);
    }
    if (row?.b?.id && !graphNodeIds.includes(row.b.id)) {
      graphNodes.push(row.b);
      graphNodeIds.push(row.b.id);
    }
    if (row?.c?.id && !graphNodeIds.includes(row.c.id)) {
      graphNodes.push(row.c);
      graphNodeIds.push(row.c.id);
    }
    if (row?.f?.id && !graphNodeIds.includes(row.f.id)) {
      graphNodes.push(row.f);
      graphNodeIds.push(row.f.id);
    }
    if (row?.s?.id && !graphNodeIds.includes(row.s.id)) {
      graphNodes.push(row.s);
      graphNodeIds.push(row.s.id);
    }
    if (row?.t?.id && !graphNodeIds.includes(row.t.id)) {
      graphNodes.push(row.t);
      graphNodeIds.push(row.t.id);
    }
    if (row?.a?.id && !graphRelationshipIds.includes(row.a.id)) {
      graphRelationships.push(row.a);
      graphRelationshipIds.push(row.a.id);
    }
    if (row?.bb?.id && !graphRelationshipIds.includes(row.bb.id)) {
      graphRelationships.push(row.bb);
      graphRelationshipIds.push(row.bb.id);
    }
    if (row?.cc?.id && !graphRelationshipIds.includes(row.cc.id)) {
      graphRelationships.push(row.cc);
      graphRelationshipIds.push(row.cc.id);
    }
    if (row?.d?.id && !graphRelationshipIds.includes(row.d.id)) {
      graphRelationships.push(row.d);
      graphRelationshipIds.push(row.d.id);
    }
    if (row?.r?.id && !graphRelationshipIds.includes(row.r.id)) {
      graphRelationships.push(row.r);
      graphRelationshipIds.push(row.r.id);
    }
    if (row?.rsf?.id && !graphRelationshipIds.includes(row.rsf.id)) {
      graphRelationships.push(row.rsf);
      graphRelationshipIds.push(row.rsf.id);
    }
    if (row?.ts1?.id && !graphRelationshipIds.includes(row.ts1.id)) {
      graphRelationships.push(row.ts1);
      graphRelationshipIds.push(row.ts1.id);
    }
    if (row?.ts2?.id && !graphRelationshipIds.includes(row.ts2.id)) {
      graphRelationships.push(row.ts2);
      graphRelationshipIds.push(row.ts2.id);
    }
    if (row?.rc?.id && !graphRelationshipIds.includes(row.rc.id)) {
      graphRelationships.push(row.rc);
      graphRelationshipIds.push(row.rc.id);
    }
  });

  const nodes: GraphNodeDatum[] = [];
  graphNodes.forEach((e: GraphNode) => {
    // colours by https://github.com/catppuccin/catppuccin Macchiato theme
    const color =
      e?.labels?.at(0) === `StoryFragment`
        ? `#f4dbd6`
        : e?.labels?.at(0) === `TractStack`
          ? `#f0c6c6`
          : e?.labels?.at(0) === `Corpus`
            ? `#f5bde6`
            : e?.labels?.at(0) === `Visit`
              ? `#c6a0f6`
              : e?.labels?.at(0) === `Belief`
                ? `#ed8796`
                : e?.labels?.at(0) === `Fingerprint`
                  ? `#ee99a0`
                  : `#f5a97f`;
    if (e?.id && e?.properties?.object_type && e?.properties?.object_name)
      nodes.push({
        id: e.id,
        title: e.properties.object_type,
        label: e.properties.object_name,
        value: e.properties.pageRank || 0,
        color: color,
      });
    else if (e?.id && e?.properties?.fingerprint_id)
      nodes.push({
        id: e.id,
        title: `You`,
        label: `You`,
        color: color,
      });
    else if (e?.id && e?.properties?.belief_id) {
      nodes.push({
        id: e.id,
        title: `Belief`,
        label: e.properties.belief_id,
        color: color,
      });
    } else if (e?.id && e?.properties?.visit_id)
      nodes.push({
        id: e.id,
        title: `Visit`,
        label: `Visit`,
        color: color,
      });
  });
  const edges: GraphRelationshipDatum[] = graphRelationships.map((e: GraphNode) => {
    const label =
      typeof e?.properties?.object === `string`
        ? e.properties.object
        : typeof e?.type === `string`
          ? e.type
          : `unknown`;
    return {
      from: e.startNodeId,
      to: e.endNodeId,
      label: label,
      font: { align: `top`, size: `8` },
      arrows: {
        to: {
          enabled: true,
          type: `triangle`,
        },
      },
    };
  });

  return { nodes, edges };
};

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// Loading indicator and animation logic
let progressInterval: NodeJS.Timeout | null = null;

export function startLoadingAnimation() {
  const loadingIndicator = document.getElementById("loading-indicator") as HTMLElement;
  const content = document.getElementById("content") as HTMLElement;

  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    loadingIndicator.style.transform = "scaleX(0)";
    loadingIndicator.style.display = "block";
    content.style.opacity = "0.7";

    let progress = 0;
    progressInterval = setInterval(() => {
      progress += 2;
      if (progress > 90) {
        if (progressInterval !== null) {
          clearInterval(progressInterval);
        }
      }
      loadingIndicator.style.transform = `scaleX(${progress / 100})`;
    }, 20);
  }
}

export function stopLoadingAnimation() {
  const loadingIndicator = document.getElementById("loading-indicator") as HTMLElement;
  const content = document.getElementById("content") as HTMLElement;

  if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
    }
    loadingIndicator.style.transform = "scaleX(1)";
    content.style.opacity = "1";

    setTimeout(() => {
      loadingIndicator.style.display = "none";
      loadingIndicator.style.transform = "scaleX(0)";
    }, 300);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isDeepEqual(obj1: any, obj2: any, excludeKeys: string[] = []) {
  // Check if both are the same type and are objects
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return obj1 === obj2;
  }

  // Get the keys of both objects
  const keys1 = Object.keys(obj1).filter((key) => !excludeKeys.includes(key));
  const keys2 = Object.keys(obj2).filter((key) => !excludeKeys.includes(key));

  // Check if the number of keys is the same
  if (keys1.length !== keys2.length) {
    return false;
  }

  // Check if all keys and their values are equal
  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key], excludeKeys)) {
      return false;
    }
  }
  return true;
}

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "but",
  "if",
  "or",
  "because",
  "as",
  "until",
  "while",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
]);

export function findUniqueSlug(slug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(slug)) {
    return slug;
  }
  let counter = 1;
  let newSlug = `${slug}-${counter}`;
  while (existingSlugs.includes(newSlug)) {
    counter++;
    newSlug = `${slug}-${counter}`;
  }
  return newSlug;
}

export function cleanString(s: string): string {
  if (!s) return s;
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9\s-_]/g, "");
  s = s.replace(/\s+/g, "-");
  const words = s.split(/[-_]/);
  if (words.length > 1) {
    s = words.filter((word) => !stopWords.has(word)).join("-");
  }
  s = s.replace(/^[^a-z]+/, "");
  s = s.replace(/[-_]{2,}/g, "-");
  s = s.replace(/^[-_]+|[-_]+$/g, "");
  if (!s.match(/^[a-z][a-z0-9-_]*[a-z0-9]$/)) {
    s = s.replace(/[^a-z0-9]/g, "");
  }
  return s;
}

export function cleanStringUpper(s: string): string {
  if (!s) return s;
  return s
    .toUpperCase()
    .replace(/[\d\-_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");
}

export function sortULIDs(ulids: string[]) {
  return ulids.sort((a, b) => {
    const toBinary = (ulid: string) => {
      return Array.from(ulid, (char) => char.charCodeAt(0).toString(2).padStart(8, "0")).join("");
    };

    const binaryA = toBinary(a);
    const binaryB = toBinary(b);

    return binaryA.localeCompare(binaryB);
  });
}

export async function getOptimizedImage(src: string) {
  try {
    const img = await getImage({
      src,
      inferSize: true,
    });
    return img.src;
  } catch {
    console.log(`error generating images -- are you offline?`);
    return null;
  }
}

async function getOptimizedImageSet(baseUrl: string): Promise<string[]> {
  const sizes = [600, 1080, 1920];
  const optimizedUrls = await Promise.all(
    sizes.map(async (size) => {
      const sizeUrl = baseUrl.replace(/(\.[^.]+)$/, `_${size}px$1`);
      const optimizedSrc = sizeUrl; //await getOptimizedImage(sizeUrl);
      return optimizedSrc ? `${optimizedSrc} ${size}w` : "";
    })
  );
  return optimizedUrls.filter(Boolean);
}

export async function getOptimizedImages(
  filesInput: TursoFileNode[] | TursoFileNode[][],
  paneId?: string
): Promise<FileNode[]> {
  const allFiles = Array.isArray(filesInput[0])
    ? (filesInput as TursoFileNode[][]).flat()
    : (filesInput as TursoFileNode[]);

  const optimizedImages: FileNode[] = await Promise.all(
    allFiles.map(async (f: TursoFileNode) => {
      // Remove /api prefix from URL
      let optimizedSrc: string | undefined = undefined;
      let cleanUrl = f.url;
      const cleanFile = !f.src_set ? f.url : f.url.replace(/(\.[^.]+)$/, "_1920px$1");

      // Check if file exists
      try {
        await fs.access(path.join(process.cwd(), "public", cleanFile));
      } catch {
        // Return with default static image if file not found
        return {
          id: f.id,
          filename: f.filename,
          altDescription: f.alt_description,
          src: "/static.jpg",
          srcSet: false,
          paneId: paneId || f.paneId,
          markdown: f.markdown,
          optimizedSrc: "/static.jpg",
        };
      }

      if (!f.filename.endsWith(`svg`) && f.src_set) {
        const optimizedUrls = await getOptimizedImageSet(cleanUrl);
        optimizedSrc = optimizedUrls.length ? optimizedUrls.join(", ") : "/static.jpg";
        cleanUrl = optimizedUrls.length ? optimizedUrls[0].split(" ")[0] : "/static.jpg";
      }

      return {
        id: f.id,
        filename: f.filename,
        altDescription: f.alt_description,
        src: cleanUrl,
        srcSet: f.src_set,
        paneId: paneId || f.paneId,
        markdown: f.markdown,
        optimizedSrc,
      };
    })
  );

  return optimizedImages;
}

export const timestampNodeId = (id: string): string => `${id}-${Date.now()}`;

export const createNodeIdFromDragNode = (node: DragNode): string => {
  if (!node) return "";
  return createNodeId(node.fragmentId, node.paneId, node.outerIdx, node.idx);
};
export const createNodeId = (
  fragmentId: string,
  paneId: string,
  outerIdx: number,
  idx: number | null
): string => {
  return `${fragmentId}-${paneId}-${outerIdx}-${idx || 0}`;
};

export function swapObjectValues(obj: any, key1: string, key2: string): any {
  if (!(key1 in obj) || !(key2 in obj)) {
    return obj;
  }

  const temp = obj[key1];
  obj[key1] = obj[key2];
  obj[key2] = temp;
  return obj;
}

export const getHtmlTagFromMdast = (mdastNode: any): string | null => {
  // Convert MDAST node to HAST
  const hastNode = toHast(mdastNode);
  // Check if we have a valid HAST node and return its tagName
  if (hastNode && "tagName" in hastNode) {
    return hastNode.tagName ? hastNode.tagName : null;
  }
  return null;
};

export function findIndicesFromLookup(
  values: string[], // string numeric keys, like: [1, 3, 5]
  startIdx: number,
  targetIdx: number
) {
  const sortedValues = values.map(Number).sort((a, b) => a - b);
  const findFloorIndex = (arr: number[], target: number): number => {
    let left = 0;
    let right = arr.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] <= target) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return result;
  };

  const localStart = findFloorIndex(sortedValues, startIdx);
  const localEnd = findFloorIndex(sortedValues, targetIdx);
  return { localStart, localEnd };
}

export function extractEntriesAtIndex(
  obj: { [key: string]: any[] },
  index: number
): { [key: string]: any } | null {
  if (!obj) return null;

  const result: { [key: string]: any } = {};

  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      result[key] = obj[key][index] !== undefined ? obj[key][index] : null;
    } else {
      result[key] = null;
    }
  }

  return result;
}

declare global {
  interface Array<T> {
    setAt(index: number, value: T): void;
    last(): T;
    insertBefore(index: number, items: T[]): void;
    insertAfter(index: number, items: T[]): void;
  }
}

Array.prototype.insertBefore = function <T>(this: T[], index: number, items: T[]): void {
  if (index < 0 || index > this.length) {
    throw new Error("Index out of bounds");
  }
  this.splice(index, 0, ...items);
};

Array.prototype.insertAfter = function <T>(this: T[], index: number, items: T[]): void {
  if (index < 0 || index >= this.length) {
    throw new Error("Index out of bounds");
  }
  this.splice(index + 1, 0, ...items);
};

Array.prototype.last = function <T>(): T {
  if (this.length > 0) {
    return this[this.length - 1];
  }
  return this[0];
};

Array.prototype.setAt = function <T>(index: number, value: T): void {
  if (index >= this.length) {
    this.length = index + 1; // Extend the array length
  }
  this[index] = value;
};

export function removeAt<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) {
    return undefined; // Return undefined if the index is out of bounds
  }
  return arr.splice(index, 1)[0]; // Remove and return the element at the index
}

export function getNthFromAstUsingElement(ast: HastRoot, el: RootContent) {
  if ("tagName" in el) {
    // @ts-expect-error tagName exists..
    const matchingTagElements = ast.children.filter((x) => x.tagName === el.tagName);
    const idx = matchingTagElements.findIndex((x) => x === el);
    return idx;
  }
  return -1;
}

export function deepMerge<T extends object, U extends object>(source: T, target: U): T & U {
  const result = { ...source } as T & U;

  for (const key in target) {
    if (
      Object.prototype.hasOwnProperty.call(target, key) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key]) &&
      // @ts-expect-error can index
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(source[key] as object, target[key] as object) as any;
    } else {
      // Overwrite or add the property
      result[key] = target[key] as any;
    }
  }

  return result;
}

export function mergeObjectKeys(...objects: Record<string, any>[]): string[] {
  const keysSet = new Set<string>();

  for (const obj of objects) {
    for (const key in obj) {
      if (key) {
        keysSet.add(key);
      }
    }
  }

  return Array.from(keysSet);
}

export const getFinalLocation = (
  loc: Location,
  allowTag: { before: boolean; after: boolean }
): "before" | "after" | "none" => {
  if (loc === Location.BEFORE && allowTag.before) {
    return "before";
  } else if (loc === Location.AFTER && allowTag.after) {
    return "after";
  }
  return "none";
};

export const blobToBase64 = (blob: Blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

export const isListContainer = (markdown: MarkdownLookup): boolean => {
  if (!markdown) return false;
  // single element in the nth tag, likely not a list
  if (Object.values(markdown.nthTag).length <= 1) return false;

  // if all the nth tags are ol/ul then image is in list container
  return Object.values(markdown.nthTag).every((tag) => ["ul", "ol"].includes(tag));
};

export function createDefaultImageNode(original: TursoFileNode, paneId?: string): FileNode {
  return {
    id: original.id,
    filename: original.filename,
    altDescription: original.alt_description,
    src: "/static.jpg",
    srcSet: false,
    paneId: paneId || original.paneId,
    markdown: original.markdown,
    optimizedSrc: "/static.jpg",
  };
}

export function formatDateForUrl(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

export const JSONBetterStringify = (obj: any): any => {
  return JSON.stringify(obj, replacer);
};

export const JSONBetterParser = (obj: any): any => {
  return JSON.parse(obj, reviver);
};

function replacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function reviver(key: string, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}

export function convertToString(value: TupleValue): string {
  if (typeof value === "string") return value;

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

export const formatAndValidateUrl = (
  input: string
): {
  url: string;
  isValid: boolean;
  error?: string;
} => {
  try {
    // Trim whitespace
    let formatted = input.trim().toLowerCase();

    // Add protocol if missing
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
    }

    // Try to construct URL (this will throw if invalid)
    const url = new URL(formatted);

    // Additional validation if needed
    if (!url.hostname.includes(".")) {
      return {
        url: input,
        isValid: false,
        error: "Please enter a valid domain",
      };
    }

    return {
      url: url.toString(),
      isValid: true,
    };
  } catch {
    return {
      url: input,
      isValid: false,
      error: "Please enter a valid URL",
    };
  }
};
