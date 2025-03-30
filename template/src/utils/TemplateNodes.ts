import type { TemplateNode } from "@/types.ts";

export const TemplateH2Node = {
  nodeType: "TagElement",
  tagName: "h2",
  nodes: [
    {
      copy: "Catchy title",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateH3Node = {
  nodeType: "TagElement",
  tagName: "h3",
  nodes: [
    {
      copy: "Catchy sub-title",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateH4Node = {
  nodeType: "TagElement",
  tagName: "h4",
  nodes: [
    {
      copy: "Catchy sub-title",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplatePNode = {
  nodeType: "TagElement",
  tagName: "p",
  nodes: [
    {
      copy: "...",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateOLNode = {
  nodeType: "TagElement",
  tagName: "ol",
  nodes: [
    {
      copy: "...",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateULNode = {
  nodeType: "TagElement",
  tagName: "ul",
  nodes: [
    {
      copy: "...",
      tagName: "text",
    },
  ],
} as TemplateNode;

export const TemplateLINode = {
  nodeType: "TagElement",
  tagName: "li",
  nodes: [
    {
      copy: "...",
      tagName: "text",
    },
  ],
} as TemplateNode;

//export const TemplateAsideNode = {
//  nodeType: "TagElement",
//  tagName: "aside",
//  nodes: [
//    {
//      copy: "aside node",
//      tagName: "text",
//    },
//  ],
//} as TemplateNode;

export const TemplateImgNode = {
  nodeType: "TagElement",
  tagName: "img",
  src: "/static.jpg",
  alt: "New image coming soon!",
} as TemplateNode;

export const TemplateYoutubeNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "youtube(kJI4XdqiiAI|The Free Web Press)",
  codeHookParams: ["kJI4XdqiiAI", "The Free Web Press"],
} as TemplateNode;

export const TemplateToggleNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "toggle(BeliefTag|This is so awesome, right?!)",
  codeHookParams: ["BeliefTag", "This is so awesome, right?!"],
} as TemplateNode;

export const TemplateBeliefNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "belief(BeliefTag|likert|prompt)",
  codeHookParams: ["BeliefTag", "likert", "prompt"],
} as TemplateNode;

export const TemplateBunnyNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "bunny(id|title)",
  codeHookParams: ["id", "title"],
} as TemplateNode;

export const TemplateEmailSignUpNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "signup(major|Keep in touch!|false)",
  codeHookParams: ["major", "Keep in touch!", "false"],
} as TemplateNode;

export const TemplateIdentifyAsNode = {
  nodeType: "TagElement",
  tagName: "code",
  copy: "identifyAs(BeliefTag|TARGET_VALUE|prompt)",
  codeHookParams: ["BeliefTag", "TARGET_VALUE", "prompt"],
} as TemplateNode;
