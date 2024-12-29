import type { TemplateNode } from "@/types.ts";

export const TemplateH2Node = {
  nodeType: "TagElement",
  tagName: "h2",
  nodes: [
    {
      text: "H2 node",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateH3Node = {
  nodeType: "TagElement",
  tagName: "h3",
  nodes: [
    {
      text: "H3 node",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplatePNode = {
  nodeType: "TagElement",
  tagName: "p",
  nodes: [
    {
      text: "P node",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateH4Node = {
  nodeType: "TagElement",
  tagName: "h4",
  nodes: [
    {
      text: "h4 node",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateAsideNode = {
  nodeType: "TagElement",
  tagName: "aside",
  nodes: [
    {
      text: "aside node",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateImgNode = {
  nodeType: "TagElement",
  tagName: "img",
  src: "/images/2024-11/rBOU0YdIVX_600px.webp",
  srcSet:
    "/images/2024-11/rBOU0YdIVX_600px.webp 600w, /images/2024-11/rBOU0YdIVX_1080px.webp 1080w, /images/2024-11/rBOU0YdIVX_1920px.webp 1920w",
  alt: "Screenshot of engagement analytics",
} as TemplateNode;
