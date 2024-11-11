import type { Root, Element, Text, RootContent, ElementContent } from "hast";
import type { Tag, MarkdownLookup } from "../../types";

export function generateMarkdownLookup(htmlAst: Root): MarkdownLookup {
  const markdownLookup: MarkdownLookup = {
    images: {},
    codeItems: {},
    listItems: {},
    links: {},
    imagesLookup: {},
    codeItemsLookup: {},
    listItemsLookup: {},
    linksLookup: {},
    linksByTarget: {}, // New property for storing link information by target
    nthTag: {},
    nthTagLookup: {},
  };

  let imagesIndex = 0;
  let codeItemsIndex = 0;
  let listItemsIndex = 0;
  let linksIndex = 0;
  let globalTagIndex = 0;

  function processRootNode(node: Element | Text, parentNth: number) {
    if ("tagName" in node) {
      // Add to nthTag and nthTagLookup
      markdownLookup.nthTag[globalTagIndex] = node.tagName as string as Tag;
      if (!markdownLookup.nthTagLookup[node.tagName]) {
        markdownLookup.nthTagLookup[node.tagName] = {};
      }
      const nthForTag = Object.keys(markdownLookup.nthTagLookup[node.tagName]).length;
      markdownLookup.nthTagLookup[node.tagName][globalTagIndex] = {
        nth: nthForTag,
      };
      globalTagIndex++;

      // Process children
      if ("children" in node && Array.isArray(node.children)) {
        node.children.forEach((childNode, childNth) => {
          if (isProcessableNode(childNode)) {
            processNode(childNode, parentNth, childNth);
          }
        });
      }
    }
  }

  function processNode(node: Element | Text, parentNth: number, childNth: number) {
    if ("tagName" in node) {
      switch (node.tagName) {
        case "img":
          addToLookup("images", imagesIndex, parentNth, childNth);
          imagesIndex++;
          break;
        case "code":
          addToLookup("codeItems", codeItemsIndex, parentNth, childNth);
          codeItemsIndex++;
          break;
        case "li":
          addToLookup("listItems", listItemsIndex, parentNth, childNth);
          listItemsIndex++;
          break;
        case "a":
          addToLookup("links", linksIndex, parentNth, childNth);
          if (node.properties && typeof node.properties.href === "string") {
            markdownLookup.linksByTarget[node.properties.href] = {
              globalNth: linksIndex,
              parentNth,
              childNth,
            };
          }
          linksIndex++;
          break;
        default:
      }
    }

    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach((childNode) => {
        if (isProcessableNode(childNode)) {
          processNode(childNode, parentNth, childNth);
        }
      });
    }
  }

  function addToLookup(
    type: "images" | "codeItems" | "listItems" | "links",
    globalNth: number,
    parentNth: number,
    childNth: number
  ) {
    markdownLookup[type][globalNth] = { parentNth, childNth };
    const lookupType = `${type}Lookup` as `${typeof type}Lookup`;
    if (!markdownLookup[lookupType][parentNth]) {
      markdownLookup[lookupType][parentNth] = {};
    }
    markdownLookup[lookupType][parentNth][childNth] = globalNth;
  }

  function isProcessableNode(node: ElementContent | RootContent): node is Element | Text {
    return "tagName" in node || "value" in node;
  }

  htmlAst?.children?.forEach((node, parentNth) => {
    if (isProcessableNode(node)) {
      processRootNode(node, parentNth);
    }
  });
  return markdownLookup;
}
