import { getColor, tailwindToHex } from "@/utils/tailwind/tailwindColors";
import type { Theme, TemplatePane, ParentClassesPayload } from "@/types";

export const templateCategories = [
  {
    id: "all",
    title: "All designs",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      ...templateCategories[1].getTemplates(theme, brand, useOdd),
      //    ...templateCategories[2].getTemplates(theme, brand, useOdd),
      //    ...templateCategories[3].getTemplates(theme, brand, useOdd),
    ],
  },
  {
    id: "paragraph",
    title: "Paragraphs & Content",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getParagraphDefault(theme, brand, useOdd),
      getParagraphOneColumn(theme, brand, useOdd),
      getParagraphCenter(theme, brand, useOdd),
    ],
  },
] as const;

const getBaseParagraphClasses = (theme: Theme) => ({
  h2: {
    mobile: {
      fontWEIGHT: "bold",
      textCOLOR: getColor(
        {
          light: "brand-7",
          "light-bw": "brand-1",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "brand-8",
          "dark-bold": "brand-3",
        },
        theme
      ),
      textSIZE: "3xl",
      lineHEIGHT: "snug",
      fontFACE: "action",
    },
    tablet: {
      textSIZE: "5xl",
    },
    desktop: {
      textSIZE: "6xl",
    },
  },
  h3: {
    mobile: {
      fontWEIGHT: "bold",
      textCOLOR: getColor(
        {
          light: "brand-7",
          "light-bw": "brand-1",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "white",
          "dark-bold": "brand-3",
        },
        theme
      ),
      textSIZE: "xl",
      fontFACE: "action",
    },
    tablet: {
      textSIZE: "3xl",
    },
    desktop: {},
  },
  h4: {
    mobile: {
      textCOLOR: getColor(
        {
          light: "brand-7",
          "light-bw": "brand-1",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "white",
          "dark-bold": "brand-3",
        },
        theme
      ),
      textSIZE: "xl",
      fontFACE: "action",
    },
    tablet: {
      textSIZE: "2xl",
    },
    desktop: {},
  },
  p: {
    mobile: {
      textCOLOR: getColor(
        {
          light: "brand-7",
          "light-bw": "brand-1",
          "light-bold": "brand-7",
          dark: "brand-8",
          "dark-bw": "brand-2",
          "dark-bold": "brand-8",
        },
        theme
      ),
      textSIZE: "lg",
      lineHEIGHT: "loose",
      py: "2.5",
    },
    tablet: {
      textSIZE: "xl",
      py: "3.5",
    },
    desktop: {},
  },
});

const getBaseParentClasses = (theme: Theme): ParentClassesPayload => {
  return [
    {
      mobile: {
        mx: "5",
        my: "16",
      },
      tablet: {
        mx: "10",
      },
      desktop: {},
    },
    {
      mobile: {
        mx: "auto",
        maxW: "none",
      },
      tablet: {
        maxW: "screen-lg",
      },
      desktop: {
        maxW: "screen-xl",
      },
    },
    {
      mobile: {
        px: "9",
        py: "10",
      },
      tablet: {
        px: "14",
      },
      desktop: {
        px: "32",
      },
    },
  ];
};

function getParagraphDefault(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  const baseClasses = getBaseParentClasses(theme);
  baseClasses[2].mobile.textALIGN = "left";
  baseClasses[2].mobile.textWRAP = "pretty";

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Paragraph section",
    slug: "paragraph-default",
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
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
    },
  };
}

function getParagraphCenter(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  const baseClasses = getBaseParentClasses(theme);
  baseClasses[2].mobile.textALIGN = "center";
  baseClasses[2].mobile.textWRAP = "balance";

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Paragraph section - centered",
    slug: "paragraph-center",
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
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
    },
  };
}

function getParagraphOneColumn(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  const baseClasses = getBaseParentClasses(theme);
  baseClasses[2].mobile.textALIGN = "left";
  baseClasses[2].mobile.textWRAP = "pretty";
  baseClasses[2].mobile.maxW = "3xl";

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Paragraph section - one column",
    slug: "paragraph-onecolumn",
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
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
    },
  };
}
