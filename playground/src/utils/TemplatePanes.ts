import type { TemplatePane, Theme } from "@/types.ts";
import {
  //TemplateAsideNode,
  TemplateH2Node,
  TemplateH3Node,
  TemplatePNode,
} from "@/utils/TemplateNodes.ts";
import { getTemplateSimpleMarkdown } from "@/utils/TemplateMarkdowns.ts";
import { getColor, tailwindToHex } from "@/utils/tailwind/tailwindColors.ts";

export const getTemplateVisualBreakPane = (variant: string) => {
  // colour will be set on insert based on adjacent nodes
  const breakConfig = {
    collection: "kCz",
    image: variant,
    svgFill: "black",
  };
  return {
    nodeType: "Pane",
    title: "Visual Break Pane",
    slug: "visual-break-pane",
    bgColour: "white",
    bgPane: {
      nodeType: "BgPane",
      type: "visual-break",
      breakDesktop: breakConfig,
      breakTablet: breakConfig,
      breakMobile: breakConfig,
    },
  } as TemplatePane;
};

export const getTemplateSimplePane = (theme: Theme, brand: string, useOdd: boolean = false) => {
  return {
    nodeType: "Pane",
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? "brand-2" : "white",
          "light-bw": !useOdd ? "white" : "brand-2",
          "light-bold": !useOdd ? "brand-2" : "white",
          dark: !useOdd ? "black" : "brand-1",
          "dark-bw": !useOdd ? "black" : "brand-1",
          "dark-bold": !useOdd ? "brand-1" : "black",
        },
        theme
      ),
      brand
    ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      nodes: [
        { ...TemplateH2Node, copy: "H2 node in simple pane" },
        { ...TemplatePNode, copy: "P node in simple pane" },
        { ...TemplateH3Node, copy: "H3 node in simple pane" },
        //{ ...TemplateAsideNode, copy: "Aside node in simple pane" },
      ],
    },
  } as TemplatePane;
};

export const getTemplateMarkdownPane = (
  theme: Theme,
  variant: string,
  brand: string,
  useOdd: boolean = false
) => {
  console.log(`variant: ${variant}`);
  return {
    nodeType: "Pane",
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? "brand-2" : "white",
          "light-bw": !useOdd ? "white" : "brand-2",
          "light-bold": !useOdd ? "brand-2" : "white",
          dark: !useOdd ? "black" : "brand-1",
          "dark-bw": !useOdd ? "black" : "brand-1",
          "dark-bold": !useOdd ? "brand-1" : "black",
        },
        theme
      ),
      brand
    ),
    markdown: {
      ...getTemplateSimpleMarkdown(theme),
      markdownBody: `## add a catchy title here\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n[Try it now!](try) &nbsp; [Learn more](learn)\n`,
    },
  } as TemplatePane;
};
