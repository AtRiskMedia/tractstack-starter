/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MarkdownLookup, TupleValue } from "../../types";
import { stopWords } from "@/constants";
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
  const thisScale =
    innerWidth < 801
      ? (innerWidth - scrollBarWidth) / 600
      : innerWidth < 1367
        ? (innerWidth - scrollBarWidth) / 1080
        : (innerWidth - scrollBarWidth) / 1920;
  document.documentElement.style.setProperty(`--scale`, thisScale.toString());
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
  const aboveFold = window.innerHeight > rootElement.scrollTop;
  if (!aboveFold && button) {
    // Show button
    button.classList.add("block");
    button.classList.remove("hidden");
  } else if (button) {
    // Hide button
    button.classList.add("hidden");
    button.classList.remove("block");
  }
}

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
    content.style.opacity = "0.5";

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

export function cleanAllowCapsString(s: string): string {
  if (!s) return s;
  s = s.replace(/[^a-zA-Z0-9\s-_]/g, "");
  s = s.replace(/\s+/g, "-");
  const words = s.split(/[-_]/);
  if (words.length > 1) {
    s = words.filter((word) => !stopWords.has(word.toLowerCase())).join("-");
  }
  s = s.replace(/^[^a-zA-Z]+/, "");
  s = s.replace(/[-_]{2,}/g, "-");
  s = s.replace(/^[-_]+|[-_]+$/g, "");
  if (!s.match(/^[a-zA-Z][a-zA-Z0-9-_]*[a-zA-Z0-9]$/)) {
    s = s.replace(/[^a-zA-Z0-9]/g, "");
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

export function titleToSlug(title: string, maxLength: number = 50): string {
  const slug = cleanString(title);
  if (slug.length <= maxLength) {
    return slug;
  }
  const words = slug.split("-");
  let result = "";
  for (const word of words) {
    if ((result + (result ? "-" : "") + word).length > maxLength) {
      break;
    }
    result += (result ? "-" : "") + word;
  }
  if (!result) {
    result = slug.slice(0, maxLength);
  }
  return result.replace(/-+$/, "");
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

export function joinUrlPaths(base: string, path: string): string {
  // Trim trailing slash from base
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  // Trim leading slash from path
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;

  // Join with a single slash
  return `${trimmedBase}/${trimmedPath}`;
}
