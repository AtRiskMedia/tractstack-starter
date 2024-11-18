import { fromMarkdown } from "mdast-util-from-markdown";
import { toHast } from "mdast-util-to-hast";
import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { MS_BETWEEN_UNDO, MAX_HISTORY_LENGTH } from "../../constants";
import { cloneDeep } from "../../utils/helpers";
import { tailwindClasses } from "../../assets/tailwindClasses";
import type {
  Root as HastRoot,
  Element as HastElement,
  Text as HastText,
} from "hast";
import type { Root as MdastRoot, List, ListItem } from "mdast";
import type {
  Tag,
  PaneAstTargetId,
  FieldWithHistory,
  HistoryEntry,
  MarkdownEditDatum,
  MarkdownLookup,
  MarkdownLookupObj,
  OptionsPayloadDatum,
  ClassNamesPayloadInnerDatum,
  Tuple,
  TupleValue,
  ToolAddMode,
  ViewportAuto,
  GeneratedCopy,
} from "../../types";

export function allowTagErase(
  outerIdx: number,
  idx: number | null,
  markdownLookup: MarkdownLookup
) {
  const parentTag = markdownLookup.nthTag[outerIdx];
  const ulBefore = outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] === `ul`;
  const ulAfter =
    outerIdx + 1 < Object.keys(markdownLookup.nthTag).length &&
    markdownLookup.nthTag[outerIdx + 1] === `ul`;
  const olBefore = outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] === `ol`;
  const olAfter =
    outerIdx + 1 < Object.keys(markdownLookup.nthTag).length &&
    markdownLookup.nthTag[outerIdx + 1] === `ol`;
  if (
    [`p`, `h2`, `h3`, `h4`].includes(parentTag) ||
    ([`ol`, `ul`].includes(parentTag) &&
      typeof idx === `number` &&
      Object.keys(markdownLookup.listItemsLookup[outerIdx]).length > 1)
  ) {
    // must check whether removing this element causes a collapsed ol or ul
    return !(ulBefore && ulAfter) && !(olBefore && olAfter);
  }
  if ([`ol`, `ul`].includes(parentTag) && typeof idx === `number`) {
    // li with siblings; allow
    return true;
  }
  if (typeof idx !== `number`) {
    // unknown case; should not happen
    console.log(`?? on erase`, parentTag, outerIdx, idx, markdownLookup);
    return false;
  }
  return false;
}

export function allowTagInsert(
  toolAddMode: ToolAddMode,
  outerIdx: number,
  idx: number | null,
  markdownLookup: MarkdownLookup
) {
  switch (toolAddMode) {
    case `p`:
    case `h2`:
    case `h3`:
    case `h4`: {
      if (typeof idx !== `number`) return { before: true, after: true };
      const siblings =
        Object.keys(markdownLookup.listItemsLookup[outerIdx]).length - 1;
      return { before: idx === 0, after: idx === siblings };
    }
    case `img`: {
      const parentTag = markdownLookup.nthTag[outerIdx];
      const hasWidget =
        typeof markdownLookup.codeItemsLookup[outerIdx] !== `undefined`;
      const hasLinks =
        typeof markdownLookup.linksLookup[outerIdx] !== `undefined`;

      // is this already ul > with links or widgets ?
      if (
        typeof idx === `number` &&
        parentTag === `ul` &&
        (hasLinks || hasWidget)
      )
        return { before: false, after: false };

      // is this already ul > img ?
      if (
        typeof idx === `number` &&
        parentTag === `ul` &&
        !hasLinks &&
        !hasWidget
      )
        return { before: true, after: true };

      // check for adjascent ul
      if (typeof idx !== `number`) {
        const parentBeforeTag =
          (outerIdx === 0 && parentTag !== `ul`) ||
          (outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] !== `ul`);
        const parentAfterTag =
          outerIdx < Object.keys(markdownLookup.nthTag).length &&
          markdownLookup.nthTag[outerIdx + 1] !== `ul`;
        return { before: parentBeforeTag, after: parentAfterTag };
      } else {
        // nested ul > li, allow insert before and after
        const siblings =
          Object.keys(markdownLookup.listItemsLookup[outerIdx]).length - 1;
        const parentBeforeTag =
          outerIdx === 0 ||
          (outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] !== `ul`);
        const parentAfterTag =
          outerIdx < Object.keys(markdownLookup.nthTag).length &&
          markdownLookup.nthTag[outerIdx + 1] !== `ul`;
        return {
          before: idx === 0 && parentBeforeTag,
          after: idx === siblings && parentAfterTag,
        };
      }
    }
    case `yt`:
    case `signup`:
    case `bunny`:
    case `belief`:
    case `identify`:
    case `toggle`:
      {
        if (typeof idx !== `number`) {
          // only allow if no adjascent ul
          const parentBeforeTag =
            outerIdx === 0 ||
            (outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] !== `ul`);
          const parentAfterTag =
            outerIdx < Object.keys(markdownLookup.nthTag).length &&
            markdownLookup.nthTag[outerIdx + 1] !== `ul`;
          return { before: parentBeforeTag, after: parentAfterTag };
        }
      }
      break;
    case `aside`: {
      const parentTag = markdownLookup.nthTag[outerIdx];
      // is this already ol ?
      if (typeof idx === `number` && parentTag === `ol`)
        return { before: true, after: true };
      if (typeof idx !== `number`) {
        // check for adjascent ol
        const parentBeforeTag =
          outerIdx === 0 ||
          (outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] !== `ol`);
        const parentAfterTag =
          outerIdx < Object.keys(markdownLookup.nthTag).length &&
          markdownLookup.nthTag[outerIdx + 1] !== `ol`;
        return { before: parentBeforeTag, after: parentAfterTag };
      } else {
        // nested ul > li, allow insert before and after
        const siblings =
          Object.keys(markdownLookup.listItemsLookup[outerIdx]).length - 1;
        const parentBeforeTag =
          outerIdx === 0 ||
          (outerIdx > 0 && markdownLookup.nthTag[outerIdx - 1] !== `ol`);
        const parentAfterTag =
          outerIdx < Object.keys(markdownLookup.nthTag).length &&
          markdownLookup.nthTag[outerIdx + 1] !== `ol`;
        return {
          before: idx === 0 && parentBeforeTag,
          after: idx === siblings && parentAfterTag,
        };
      }
    }
  }

  return { before: false, after: false };
}

export function updateHistory(
  currentField: FieldWithHistory<MarkdownEditDatum>,
  now: number
): HistoryEntry<MarkdownEditDatum>[] {
  const newHistory = cloneDeep(currentField.history);
  const timeSinceLastUpdate = now - (newHistory[0]?.timestamp || 0);
  if (timeSinceLastUpdate > MS_BETWEEN_UNDO) {
    newHistory.unshift({
      value: cloneDeep(currentField.current),
      timestamp: now,
    });
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.pop();
    }
  }
  //console.log(`newHistory`, newHistory);
  return newHistory;
}

function processMarkdownElement(
  lines: string[],
  outerIdx: number,
  idx: number | null,
  tag: string,
  action: "extract" | "update",
  newContent?: string
): string | null {
  let currentOuterIdx = 0;
  let inList = false;
  let listItemIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === "") {
      if (inList) {
        inList = false;
        listItemIndex = 0;
      }
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      // Heading handling
      const headingMatch = line.match(/^#+/);
      const headingLevel = headingMatch ? headingMatch[0].length : 0;
      if (headingLevel > 0 && headingLevel <= 6) {
        const headingTag = `h${headingLevel}`;
        if (tag === headingTag && currentOuterIdx === outerIdx) {
          if (action === "extract") {
            return line.replace(/^#+\s*/, "");
          } else if (action === "update" && newContent) {
            lines[i] = `${"#".repeat(headingLevel)} ${newContent}`;
            return lines.join("\n");
          }
        }
        currentOuterIdx++;
      }
    } else if (/`[^`\n]+`/.test(line)) {
      // Inline code handling
      if (tag === "code" && currentOuterIdx === outerIdx) {
        const codeMatch = line.match(/`([^`\n]+)`/);
        if (codeMatch) {
          if (action === "extract") {
            return codeMatch[1];
          } else if (action === "update" && newContent) {
            lines[i] = line.replace(/`[^`\n]+`/, `\`${newContent}\``);
            return lines.join("\n");
          }
        }
      }
      currentOuterIdx++;
    } else if (
      /^\d+\.\s/.test(line) ||
      /^\*\s/.test(line) ||
      /^-\s/.test(line)
    ) {
      // List item handling
      if (!inList) {
        inList = true;
        currentOuterIdx++;
      }
      if (tag === "li" && currentOuterIdx - 1 === outerIdx) {
        if (idx === null || listItemIndex === idx) {
          if (action === "extract") {
            return line.replace(/^(\d+\.|-)\s*/, "");
          } else if (action === "update" && newContent) {
            const prefix = /^\d+\.\s/.test(line)
              ? (line.match(/^\d+\./)?.at(0) ?? "1.")
              : line[0];
            lines[i] = `${prefix} ${newContent}`;
            return lines.join("\n");
          }
        }
      }
      listItemIndex++;
    } else {
      // Paragraph handling
      if (inList) {
        inList = false;
        listItemIndex = 0;
      }
      if (tag === "p" && currentOuterIdx === outerIdx) {
        if (action === "extract") {
          return line;
        } else if (action === "update" && newContent) {
          lines[i] = newContent;
          return lines.join("\n");
        }
      }
      currentOuterIdx++;
    }
  }

  return null;
}

export function extractMarkdownElement(
  fullMarkdown: string,
  tag: string,
  outerIdx: number,
  idx: number | null = null
): string {
  const lines = fullMarkdown.split("\n");
  const result = processMarkdownElement(lines, outerIdx, idx, tag, "extract");
  return result || "";
}

export function updateMarkdownElement(
  fullMarkdown: string,
  newContent: string,
  tag: string,
  outerIdx: number,
  idx: number | null = null
): string {
  const lines = fullMarkdown.split("\n");
  const result = processMarkdownElement(
    lines,
    outerIdx,
    idx,
    tag,
    "update",
    newContent
  );
  return result || fullMarkdown;
}

export function getGlobalNth(
  Tag: string,
  idx: number | null = null,
  outerIdx: number,
  markdownLookup: MarkdownLookup
): number | null {
  switch (Tag) {
    case "li":
      return idx !== null
        ? (markdownLookup?.listItemsLookup?.[outerIdx]?.[idx] ?? null)
        : null;
    case "img":
      return idx !== null
        ? (markdownLookup?.imagesLookup?.[outerIdx]?.[idx] ?? null)
        : null;
    case "code":
      return idx !== null
        ? (markdownLookup?.codeItemsLookup?.[outerIdx]?.[idx] ?? null)
        : null;
    case "a":
      return idx !== null
        ? (markdownLookup?.linksLookup?.[outerIdx]?.[idx] ?? null)
        : null;
    default:
      return markdownLookup?.nthTagLookup?.[Tag]?.[outerIdx]?.nth ?? null;
  }
}

function getNthOfHighestLessThan(
  lookupObj: MarkdownLookupObj,
  affectedNth: number,
  position: "before" | "after"
) {
  const filtered =
    position === `before`
      ? Object.fromEntries(
          Object.entries(lookupObj).filter(
            ([key]) => parseInt(key) < affectedNth
          )
        )
      : Object.fromEntries(
          Object.entries(lookupObj).filter(
            ([key]) => parseInt(key) <= affectedNth
          )
        );
  if (filtered) {
    const lastKey = Object.keys(filtered).pop();
    if (lastKey) {
      const lastElement = filtered[lastKey]?.nth;
      if (lastElement >= 0) return lastElement;
    }
  }
  return 0;
}

export function reconcileOptionsPayload(
  optionsPayload: OptionsPayloadDatum,
  outerIdx: number,
  idx: number | null,
  markdownLookup: MarkdownLookup,
  isInsertion: boolean,
  insertedTag: string | null,
  toolAddMode: ToolAddMode,
  position: "before" | "after"
): OptionsPayloadDatum {
  const newOptionsPayload: OptionsPayloadDatum = JSON.parse(
    JSON.stringify(optionsPayload)
  );
  const getLiNth = (outerIdx: number, idx?: number) => {
    if (outerIdx === 0 && typeof idx !== `number`) return 0;
    const adjustedIdx =
      typeof idx === `number` && position === `before`
        ? outerIdx - 1
        : typeof idx === `number`
          ? outerIdx + 1
          : outerIdx;
    let highestSibling = 0;
    if (typeof idx !== `number`) {
      markdownLookup?.listItemsLookup &&
        Object.keys(markdownLookup.listItemsLookup).forEach((key: string) => {
          const i = parseInt(key);
          if (!isNaN(i)) {
            if (
              (position === `before` && adjustedIdx > i) ||
              (position === `after` && adjustedIdx >= i)
            ) {
              const item = markdownLookup.listItemsLookup[i];
              if (item) {
                Object.keys(item).forEach((key: string) => {
                  highestSibling = !highestSibling
                    ? item[parseInt(key)]
                    : Math.max(highestSibling, item[parseInt(key)]);
                });
              }
            }
          }
        });
      return highestSibling;
    }
    return markdownLookup.listItemsLookup[outerIdx][idx];
  };
  const getImgNth = (outerIdx: number, idx?: number) => {
    if (outerIdx === 0 && typeof idx !== `number`) return 0;
    const adjustedIdx =
      typeof idx === `number` && position === `before`
        ? outerIdx - 1
        : typeof idx === `number`
          ? outerIdx + 1
          : outerIdx;
    let highestSibling = 0;
    if (typeof idx !== `number`) {
      markdownLookup?.imagesLookup &&
        Object.keys(markdownLookup.imagesLookup).forEach((key: string) => {
          const i = parseInt(key);
          if (!isNaN(i)) {
            if (
              (position === `before` && adjustedIdx > i) ||
              (position === `after` && adjustedIdx >= i)
            ) {
              const item = markdownLookup.imagesLookup[i];
              if (item) {
                Object.keys(item).forEach((key: string) => {
                  highestSibling = !highestSibling
                    ? item[parseInt(key)]
                    : Math.max(highestSibling, item[parseInt(key)]);
                });
              }
            }
          }
        });
      return highestSibling;
    }
    return markdownLookup.imagesLookup?.[outerIdx]?.[idx] ?? 0;
  };

  const getParentNth = (tag: string) => {
    const tagLookup = markdownLookup.nthTagLookup[tag];
    const outerTag = markdownLookup.nthTag[outerIdx];
    if (!tagLookup) return 0;
    const highestSibling = getNthOfHighestLessThan(
      tagLookup,
      outerIdx,
      position
    );
    if (position === `after` || outerTag !== tag) return highestSibling + 1;
    return highestSibling;
  };

  // modifies classNamePayload to retain integrity on insert/removal
  const processTag = (
    tag: string,
    nthToAffect: number,
    isIncrement: boolean
  ) => {
    if (!newOptionsPayload.classNamesPayload[tag]) {
      newOptionsPayload.classNamesPayload[tag] = { classes: {} };
    }

    const tagPayload = newOptionsPayload.classNamesPayload[tag];

    if (tagPayload.override) {
      const newOverride: { [key: string]: Tuple[] } = {};
      Object.entries(tagPayload.override).forEach(([selector, overrides]) => {
        const newOverrides: Tuple[] = [];
        Object.entries(overrides).forEach(([nth, value]) => {
          const nthNum = parseInt(nth);
          if (isIncrement) {
            if (
              (position === `before` && nthNum >= nthToAffect) ||
              nthNum > nthToAffect
            ) {
              newOverrides[nthNum + 1] = value as Tuple;
            } else {
              newOverrides[nthNum] = value as Tuple;
            }
          } else {
            if (nthNum < nthToAffect) {
              newOverrides[nthNum] = value as Tuple;
            } else if (nthNum > nthToAffect) {
              newOverrides[nthNum - 1] = value as Tuple;
            }
          }
        });
        if (newOverrides.length > 0) {
          newOverride[selector] = newOverrides;
        }
      });
      if (Object.keys(newOverride).length > 0) {
        tagPayload.override = newOverride;
      } else {
        delete tagPayload.override;
      }
    }
    if (typeof tagPayload.count === "number") {
      tagPayload.count += isIncrement ? 1 : -1;
      if (tagPayload.count <= 0 || !tagPayload?.override) {
        delete tagPayload.count;
      }
    } else if (isIncrement && typeof tagPayload?.override !== `undefined`) {
      tagPayload.count = 1;
    }
    if (
      Object.keys(tagPayload).length === 1 &&
      "classes" in tagPayload &&
      Object.keys(tagPayload.classes).length === 0
    ) {
      delete newOptionsPayload.classNamesPayload[tag];
    }
  };

  if (isInsertion) {
    if (toolAddMode === "img") {
      const liNth = getLiNth(outerIdx, idx || undefined);
      const imgNth = getImgNth(outerIdx, idx || undefined);
      processTag("li", liNth, true);
      processTag("img", imgNth, true);
      const parentTag = markdownLookup.nthTag[outerIdx];
      if (parentTag === "ol" || parentTag === "ul") {
        const parentNth = getParentNth(parentTag);
        processTag(parentTag, parentNth, true);
      }
    } else if (
      typeof idx !== `number` ||
      (insertedTag && [`p`, `h2`, `h3`, `h4`].includes(insertedTag))
    ) {
      if (toolAddMode === `aside`) {
        const parentNth = getParentNth(`ol`);
        processTag(`ol`, parentNth, true);
        const liNth = getLiNth(outerIdx);
        processTag(`li`, liNth, true);
      } else if (insertedTag) {
        const affectedNth = getParentNth(insertedTag);
        processTag(insertedTag, affectedNth, true);
      }
    } else {
      const liNth = getLiNth(outerIdx, idx);
      processTag(`li`, liNth, true);
      const parentTag = markdownLookup.nthTag[outerIdx];
      if (parentTag === "ol" || parentTag === "ul") {
        const parentNth = getParentNth(parentTag);
        processTag(parentTag, parentNth, true);
      }
    }
    // removal
  } else if (typeof idx === `number`) {
    // remove inner element...
    // case 1: was the entire block deleted?
    // if last li in block; must account for removed parent
    const siblings = markdownLookup.listItemsLookup[outerIdx];
    const siblingsCount = siblings && Object.keys(siblings).length;
    const parentTag = markdownLookup.nthTag[outerIdx];
    if (parentTag === "ul" || parentTag === "ol") {
      const parentPayload = newOptionsPayload.classNamesPayload[parentTag];
      if (
        parentPayload &&
        typeof parentPayload.count === "number" &&
        siblingsCount === 1
      ) {
        processTag(
          parentTag,
          markdownLookup.nthTagLookup[parentTag][outerIdx].nth,
          false
        );
      }
    }
    const imgGlobalNth = getGlobalNth("img", idx, outerIdx, markdownLookup);
    // if img...
    if (imgGlobalNth !== null) {
      const imgNth = markdownLookup.imagesLookup[outerIdx][idx];
      processTag("img", imgNth, false);
    }
    // now handle li
    const listItemNth = markdownLookup.listItemsLookup[outerIdx][idx];
    processTag(`li`, listItemNth, false);
  } else {
    // remove block element
    const affectedTag = markdownLookup.nthTag[outerIdx];
    const affectedNth =
      idx === null
        ? markdownLookup.nthTagLookup[affectedTag]?.[outerIdx]?.nth || 0
        : idx;
    processTag(affectedTag, affectedNth, false);
  }
  return newOptionsPayload;
}

export function insertElementIntoMarkdown(
  markdownEdit: MarkdownEditDatum,
  newContent: string,
  toolAddMode: ToolAddMode,
  outerIdx: number,
  idx: number | null,
  position: "before" | "after",
  markdownLookup: MarkdownLookup
): MarkdownEditDatum {
  const newMarkdown = { ...markdownEdit };
  const mdast = fromMarkdown(newMarkdown.markdown.body);
  const parentTag = markdownLookup.nthTag[outerIdx];
  let insertedTag: string = toolAddMode;
  // this is relative to the parentTag which can be misleading,
  // e.g. when insert after ul or ol, we mustn't confuse parents
  // but allowInsertTag should ensure conflicts are avoided
  if (
    typeof idx !== `number` ||
    ([`ol`].includes(parentTag) && toolAddMode === `img`) ||
    ([`ol`, `ul`].includes(parentTag) &&
      [`p`, `h2`, `h3`, `h4`].includes(toolAddMode))
  ) {
    // Insert new block
    const newNode = fromMarkdown(newContent).children[0];
    const adjustedOuterIdx = position === "after" ? outerIdx + 1 : outerIdx;
    mdast.children.splice(adjustedOuterIdx, 0, newNode);
    if ("tagName" in newNode && typeof newNode.tagName === `string`) {
      insertedTag = newNode.tagName;
    }
    // override if new aside text container
    if (toolAddMode === `aside`) insertedTag = "li";
  } else {
    // Insert nested element
    const parentNode = mdast.children[outerIdx];
    if (parentNode.type === "list" && Array.isArray(parentNode.children)) {
      let newNode = fromMarkdown(newContent).children[0];
      if (newNode.type !== "listItem") {
        newNode = {
          type: "listItem",
          children: [newNode],
        } as ListItem;
      }
      const adjustedIdx = position === "after" ? idx + 1 : idx;
      parentNode.children.splice(adjustedIdx, 0, newNode as ListItem);
      insertedTag = "li";
    }
  }

  newMarkdown.markdown.body = toMarkdown(mdast);
  newMarkdown.markdown.htmlAst = cleanHtmlAst(
    toHast(mdast) as HastRoot
  ) as HastRoot;
  newMarkdown.payload.optionsPayload = reconcileOptionsPayload(
    newMarkdown.payload.optionsPayload,
    outerIdx,
    idx,
    markdownLookup,
    true,
    insertedTag,
    toolAddMode,
    position
  );
  //console.log(
  //  `payload becomes`,
  //  newMarkdown.payload.optionsPayload.classNamesPayload
  //);
  //console.log(`markdown becomes`, newMarkdown.markdown.body);

  return newMarkdown;
}

export function removeElementFromMarkdown(
  markdownEdit: MarkdownEditDatum,
  outerIdx: number,
  idx: number | null,
  markdownLookup: MarkdownLookup
): MarkdownEditDatum {
  const newMarkdown = { ...markdownEdit };
  const mdast = fromMarkdown(newMarkdown.markdown.body) as MdastRoot;

  // Filter out text nodes and get only block-level elements
  const blockElements = mdast.children.filter(
    node => node.type !== "text" && node.type !== "html"
  );

  if (outerIdx >= 0 && outerIdx < blockElements.length) {
    const elementToRemove = blockElements[outerIdx];

    if (idx === null) {
      // Remove the entire block
      mdast.children = mdast.children.filter(node => node !== elementToRemove);
    } else if (
      elementToRemove.type === "list" &&
      Array.isArray((elementToRemove as List).children)
    ) {
      // Remove a specific list item
      if (idx >= 0 && idx < (elementToRemove as List).children.length) {
        (elementToRemove as List).children.splice(idx, 1);
        if ((elementToRemove as List).children.length === 0) {
          // If the list is now empty, remove the entire list
          mdast.children = mdast.children.filter(
            node => node !== elementToRemove
          );
        }
      }
    }
  }

  // Regenerate markdown from the updated AST
  newMarkdown.markdown.body = toMarkdown(mdast);

  // Update htmlAst
  const hastRoot = toHast(mdast) as HastRoot;
  newMarkdown.markdown.htmlAst = cleanHtmlAst(hastRoot) as HastRoot;

  // Update OptionsPayloadDatum
  newMarkdown.payload.optionsPayload = reconcileOptionsPayload(
    newMarkdown.payload.optionsPayload,
    outerIdx,
    idx,
    markdownLookup,
    false,
    null,
    `p`,
    "before"
  );

  return newMarkdown;
}

export function markdownToHtmlAst(markdown: string): HastRoot {
  const mdast = fromMarkdown(markdown);
  const hast = toHast(mdast) as HastRoot;
  return ensureRoot(cleanHtmlAst(hast));
}

function ensureRoot(node: HastRoot | HastElement | HastText | null): HastRoot {
  if (node && node.type === "root") {
    return node;
  }
  return { type: "root", children: node ? [node] : [] };
}

export function cleanHtmlAst(
  node: HastRoot | HastElement | HastText
): HastRoot | HastElement | HastText | null {
  if (node.type === "text") {
    return node.value !== "\n" ? node : null;
  } else if (node.type === "element" || node.type === "root") {
    if ("children" in node) {
      node.children = node.children
        .map(child => cleanHtmlAst(child as HastElement | HastText))
        .filter((child): child is HastElement | HastText => child !== null);
    }
    return node;
  }
  return node;
}

function processClassValues(
  classes: unknown[] | null,
  overrideClasses?: Tuple | null
): [unknown | null, unknown | null, unknown | null, boolean, boolean, boolean] {
  const mobileVal =
    overrideClasses && overrideClasses.length
      ? String(overrideClasses[0])
      : Array.isArray(classes) && classes.length && classes[0] !== ``
        ? String(classes[0])
        : null;
  const tabletVal =
    overrideClasses && overrideClasses.length > 1
      ? String(overrideClasses[1])
      : overrideClasses && overrideClasses.length
        ? String(overrideClasses[0])
        : Array.isArray(classes) && classes.length > 1 && classes[1] !== ``
          ? String(classes[1])
          : mobileVal;
  const desktopVal =
    overrideClasses && overrideClasses.length > 2
      ? String(overrideClasses[2])
      : overrideClasses && overrideClasses.length > 1
        ? String(overrideClasses[1])
        : overrideClasses && overrideClasses.length
          ? String(overrideClasses[0])
          : Array.isArray(classes) && classes.length > 2 && classes[2] !== ``
            ? String(classes[2])
            : tabletVal;
  const mobileValNegative = mobileVal && mobileVal[0] === "!" ? mobileVal.substring(1) : mobileVal;
  const tabletValNegative = tabletVal && tabletVal[0] === "!" ? tabletVal.substring(1) : tabletVal;
  const desktopValNegative =
    desktopVal && desktopVal[0] === "!" ? desktopVal.substring(1) : desktopVal;
  return [
    mobileValNegative,
    tabletValNegative,
    desktopValNegative,
    mobileVal !== mobileValNegative,
    tabletVal !== tabletValNegative,
    desktopVal !== desktopValNegative,
  ];
}

export function findImageNode(
  ast: HastRoot,
  outerIdx: number,
  targetIdx: number
): HastElement | null {
  let currentIdx = 0;
  function traverse(node: HastElement): HastElement | null {
    if (node.tagName === "img") {
      if (currentIdx === targetIdx) {
        return node;
      }
      currentIdx++;
    }
    const children = node.children || [];
    for (const child of children) {
      if ("tagName" in child) {
        const result = traverse(child);
        if (result) return result;
      }
    }
    return null;
  }
  const childElement = ast.children[outerIdx];
  if (childElement && "tagName" in childElement) {
    return traverse(childElement as HastElement);
  }
  return null;
}

export const findCodeNode = (
  ast: HastRoot,
  targetIdx: number
): string | null => {
  const targetAst = ast.children[targetIdx];

  const traverse = (node: HastRoot | HastElement | HastText): string | null => {
    if (
      node.type === "element" &&
      ["ul", "li", "code"].includes(node.tagName)
    ) {
      if (node.children) {
        for (const child of node.children) {
          if (
            node.tagName === "ul" &&
            child.type === "element" &&
            child.tagName === "li"
          ) {
            return traverse(child);
          } else if (
            node.tagName === "li" &&
            child.type === "element" &&
            child.tagName === "code"
          ) {
            return traverse(child);
          } else if (
            node.tagName === "code" &&
            child.type === "text" &&
            typeof child.value === "string"
          ) {
            return child.value;
          }
        }
      }
    }
    return null;
  };

  if (targetAst) {
    return traverse(targetAst as HastRoot | HastElement | HastText);
  }
  return null;
};

export function getActiveTagData(
  activeTag: Tag | null,
  selectedStyle: string | null,
  markdownLookup: MarkdownLookup | null,
  targetId: PaneAstTargetId,
  classNamesPayload: ClassNamesPayloadInnerDatum | null,
  modalClassNamesPayload: ClassNamesPayloadInnerDatum | null,
  parentClassNamesPayload: ClassNamesPayloadInnerDatum | null,
  parentLayer: number
) {
  if (!activeTag || !selectedStyle || !markdownLookup) return null;

  switch (activeTag) {
    case "p":
    case "h2":
    case "h3":
    case "h4":
    case "ol":
    case "ul": {
      const tagLookup = markdownLookup.nthTagLookup[activeTag];
      if (!tagLookup || !tagLookup[targetId.outerIdx]) return null;
      const globalNth = tagLookup[targetId.outerIdx].nth;
      const overrideClasses =
        (classNamesPayload?.override &&
          classNamesPayload.override[selectedStyle] &&
          classNamesPayload.override[selectedStyle][globalNth]) ||
        null;
      const classes =
        classNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        selectedStyle in classNamesPayload.classes
          ? (classNamesPayload.classes as Record<string, unknown[]>)[
              selectedStyle
            ]
          : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classes, overrideClasses);
      return {
        class: selectedStyle,
        tag: activeTag,
        globalNth,
        hasOverride: !!overrideClasses,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    case "img": {
      if (
        typeof targetId.idx === `number` &&
        markdownLookup.imagesLookup[targetId.outerIdx] &&
        typeof markdownLookup.imagesLookup[targetId.outerIdx][targetId.idx] !==
          `number`
      )
        return null;
      const globalNth =
        typeof targetId.idx === `number` &&
        markdownLookup?.imagesLookup[targetId.outerIdx][targetId.idx];
      const overrideClasses =
        (classNamesPayload?.override &&
          typeof globalNth === `number` &&
          classNamesPayload.override[selectedStyle] &&
          classNamesPayload.override[selectedStyle][globalNth]) ||
        null;
      const classes =
        classNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        selectedStyle in classNamesPayload.classes
          ? (classNamesPayload.classes as Record<string, unknown[]>)[
              selectedStyle
            ]
          : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classes, overrideClasses);
      return {
        class: selectedStyle,
        tag: activeTag,
        globalNth,
        hasOverride: !!overrideClasses,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    case "li": {
      if (
        typeof targetId.idx === `number` &&
        markdownLookup.listItemsLookup[targetId.outerIdx] &&
        typeof markdownLookup.listItemsLookup[targetId.outerIdx][
          targetId.idx
        ] !== `number`
      )
        return null;
      const globalNth =
        typeof targetId.idx === `number` &&
        markdownLookup?.listItemsLookup[targetId.outerIdx][targetId.idx];
      const overrideClasses =
        (classNamesPayload?.override &&
          typeof globalNth === `number` &&
          classNamesPayload.override[selectedStyle] &&
          classNamesPayload.override[selectedStyle][globalNth]) ||
        null;
      const classes =
        classNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        selectedStyle in classNamesPayload.classes
          ? (classNamesPayload.classes as Record<string, unknown[]>)[
              selectedStyle
            ]
          : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classes, overrideClasses);
      return {
        class: selectedStyle,
        tag: activeTag,
        globalNth,
        hasOverride: !!overrideClasses,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    case "code": {
      if (
        typeof targetId.idx === `number` &&
        markdownLookup.codeItemsLookup[targetId.outerIdx] &&
        typeof markdownLookup.codeItemsLookup[targetId.outerIdx][
          targetId.idx
        ] !== `number`
      )
        return null;
      const globalNth =
        typeof targetId.idx === `number` &&
        markdownLookup.codeItemsLookup[targetId.outerIdx][targetId.idx];
      const overrideClasses =
        (classNamesPayload?.override &&
          typeof globalNth === `number` &&
          classNamesPayload.override[selectedStyle] &&
          classNamesPayload.override[selectedStyle][globalNth]) ||
        null;
      const classes =
        classNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        selectedStyle in classNamesPayload.classes
          ? (classNamesPayload.classes as Record<string, unknown[]>)[
              selectedStyle
            ]
          : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classes, overrideClasses);
      return {
        class: selectedStyle,
        tag: activeTag,
        globalNth,
        hasOverride: !!overrideClasses,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    case "modal": {
      const classes =
        modalClassNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        selectedStyle in modalClassNamesPayload.classes
          ? (modalClassNamesPayload.classes as Record<string, unknown>)[
              selectedStyle
            ]
          : null;
      const classesArray = Array.isArray(classes) ? classes : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classesArray);
      return {
        tag: `modal`,
        class: selectedStyle,
        hasOverride: false,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    case "parent": {
      const classes =
        parentClassNamesPayload?.classes &&
        typeof selectedStyle === "string" &&
        Array.isArray(parentClassNamesPayload.classes) &&
        parentClassNamesPayload.classes[parentLayer] &&
        selectedStyle in parentClassNamesPayload.classes[parentLayer]
          ? (
              parentClassNamesPayload.classes[parentLayer] as Record<
                string,
                unknown[]
              >
            )[selectedStyle]
          : null;
      const [
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
      ] = processClassValues(classes);
      return {
        tag: `parent`,
        class: selectedStyle,
        hasOverride: false,
        mobileVal,
        tabletVal,
        desktopVal,
        mobileIsNegative,
        tabletIsNegative,
        desktopIsNegative,
        values: tailwindClasses[selectedStyle].values,
        allowNegative: tailwindClasses[selectedStyle]?.allowNegative || false,
      };
    }
    default:
      return null;
  }
}

export function updateViewportTuple(
  tuple: Tuple,
  viewport: ViewportAuto,
  newValue: TupleValue
): Tuple {
  const result: TupleValue[] = [...tuple];
  switch (viewport) {
    case "mobile":
      result[0] = newValue;
      break;
    case "tablet":
      if (tuple.length > 0) {
        if (result[0] === ``) result[0] = newValue;
        else result[1] = newValue !== tuple[0] ? newValue : tuple[0];
      } else {
        result[0] = newValue;
        result[1] = newValue;
      }
      break;
    case "desktop":
      if (tuple.length === 1) {
        if (result[0] === ``) result[0] = newValue;
        else result[2] = newValue !== tuple[0] ? newValue : tuple[0];
      } else if (tuple.length === 2) {
        result[2] = newValue !== tuple[1] ? newValue : tuple[1];
      } else {
        result[0] = newValue;
        result[1] = newValue;
        result[2] = newValue;
      }
      break;
  }
  return result as Tuple;
}

export function convertMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[\[(.*?)(?:\]\(([^)]+)\))?\]\]/g, (_, linkText, url) => {
      const href =
        url ||
        `generated-link-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      return `<a data-href="${href}" class="pointer-events-none">${linkText}</a>`;
    })
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a data-href="$2" class="pointer-events-none">$1</a>'
    );
}

export const htmlToMarkdown = (html: string): string => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Handle space spans
  const spaceSpans = tempDiv.querySelectorAll("span[data-space]");
  spaceSpans.forEach(span => {
    const needNbspLeft = span.textContent !== span.textContent?.trimStart();
    const needNbspRight = span.textContent !== span.textContent?.trimEnd();
    const spanContent = span.innerHTML;
    const wrappedContent = `${needNbspLeft ? `<span style="white-space:pre"> </span>` : ``}${spanContent}${needNbspRight ? `<span style="white-space:pre"> </span>` : ``}`;
    span.outerHTML = wrappedContent;
  });

  // Restore href attributes from data-href before conversion
  const links = tempDiv.getElementsByTagName("a");
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const dataHref = link.getAttribute("data-href");
    if (dataHref) {
      link.setAttribute("href", dataHref);
      link.removeAttribute("data-href");
    }
  }

  const hast = fromHtml(tempDiv.innerHTML, { fragment: true });
  const mdast = toMdast(hast);
  let markdown = toMarkdown(mdast);

  // Additional post-processing to clean up the markdown
  markdown = markdown
    .replace(/^#{1,6}\s/gm, "") // Remove heading hashes
    .replace(/^([*-])\s/gm, "") // Remove unordered list markers
    .replace(/^\d+\.\s/gm, "") // Remove ordered list markers
    .trim(); // Trim leading/trailing whitespace

  return markdown;
};

export function findLinkNodes(ast: HastElement): HastElement[] {
  const linkNodes: HastElement[] = [];

  function traverse(node: HastElement): void {
    if (node.tagName === "a") {
      linkNodes.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        if ("tagName" in child) {
          traverse(child);
        }
      }
    }
  }

  traverse(ast);
  return linkNodes;
}

export function parseMarkdownSections(markdown: string): GeneratedCopy {
  // Remove any leading/trailing whitespace
  const cleanMarkdown = markdown.trim();

  // Initialize result object
  const result: GeneratedCopy = {
    pageTitle: "",
    title: "",
    paragraphs: [],
  };

  // Split the markdown into sections by double newlines
  const sections = cleanMarkdown.split(/\n\n+/);

  // Process sections
  let currentIndex = 0;

  // Find the H1 title (starts with single #)
  if (sections[currentIndex]?.startsWith("# ")) {
    result.pageTitle = sections[currentIndex].replace(/^# /, "").trim();
    currentIndex++;
  }

  // Process H2 section and its paragraphs
  const h2StartIndex = sections.findIndex(section => section.startsWith("## "));
  if (h2StartIndex !== -1) {
    // Collect all content from H2 until the first H3
    const h3StartIndex = sections.findIndex(
      (section, index) => index > h2StartIndex && section.startsWith("### ")
    );

    const h2EndIndex = h3StartIndex === -1 ? sections.length : h3StartIndex;

    // Join H2 section with its paragraphs
    result.title =
      sections.slice(h2StartIndex, h2EndIndex).join("\n\n").trim() + "\n\n";

    currentIndex = h3StartIndex;
  }

  // Process remaining H3 sections
  while (currentIndex !== -1 && currentIndex < sections.length) {
    const nextH3Index = sections.findIndex(
      (section, index) => index > currentIndex && section.startsWith("### ")
    );

    // Get content from current H3 to next H3 or end
    const sectionEnd = nextH3Index === -1 ? sections.length : nextH3Index;
    const sectionContent =
      sections.slice(currentIndex, sectionEnd).join("\n\n").trim() + "\n\n";

    result.paragraphs.push(sectionContent);

    currentIndex = nextH3Index;
  }

  return result;
}
