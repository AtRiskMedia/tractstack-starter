import type { TemplatePane, Theme } from "@/types.ts";
import {
  TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";
import { getComputedColor, getTemplateSimpleMarkdown } from "@/utils/TemplateMarkdowns.ts";

export const getTemplateSimplePane = (theme: Theme) => {
  return {
    nodeType: "Pane",
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour:
      getComputedColor(
        {
          light: "#fcfcfc",
          "light-bw": "brand-2",
          "light-bold": "brand-8",
          dark: "#000000",
          "dark-bw": "brand-1",
          "dark-bold": "black",
        },
        theme
      ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      nodes: [
        { ...TemplateH2Node, copy: "H2 node in simple pane" },
        { ...TemplatePNode, copy: "P node in simple pane" },
        { ...TemplateH3Node, copy: "H3 node in simple pane" },
        { ...TemplateAsideNode, copy: "Aside node in simple pane" },
      ],
    },
  } as TemplatePane;
};

export const getTemplateMarkdownPane = (theme: Theme) => {
  return {
    nodeType: "Pane",
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour:
      getComputedColor(
        {
          light: "#fcfcfc",
          "light-bw": "brand-2",
          "light-bold": "brand-8",
          dark: "#000000",
          "dark-bw": "brand-1",
          "dark-bold": "black",
        },
        theme
      ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      markdownBody: `## add a catchy title here\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n[Try it now!](try) &nbsp; [Learn more](learn)\n`,
    },
  } as TemplatePane;
};
