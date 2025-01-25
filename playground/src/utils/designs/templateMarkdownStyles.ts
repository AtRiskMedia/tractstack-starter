import { getColor, tailwindToHex } from "@/utils/tailwind/tailwindColors";
import type { Theme, TemplatePane } from "@/types";

export const templateCategories = [
  {
    id: "all",
    title: "All designs",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      ...templateCategories[1].getTemplates(theme, brand, useOdd),
      ...templateCategories[2].getTemplates(theme, brand, useOdd),
      ...templateCategories[3].getTemplates(theme, brand, useOdd),
    ],
  },
  {
    id: "intro",
    title: "Introduction Sections",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getIntroDefault(theme, brand, useOdd),
    ],
  },
  {
    id: "paragraph",
    title: "Paragraphs & Content",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getParagraphDefault(theme, brand, useOdd),
    ],
  },
  {
    id: "section",
    title: "Section Titles",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getSection(theme, brand, useOdd),
    ],
  },
] as const;

function getIntroDefault(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  return {
    nodeType: "Pane",
    id: "", // Will be set when template is used
    parentId: "", // Will be set when template is used
    isDecorative: false,
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour: tailwindToHex(
      getColor(
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
      brand
    ),
    markdown: {
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: {
        h2: {
          mobile: {
            fontWeight: "bold",
            textColor: getColor(
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
            textSize: "4xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "5xl",
          },
          desktop: {
            textSize: "6xl",
          },
        },
        h3: {
          mobile: {
            fontWeight: "bold",
            textColor: getColor(
              {
                light: "brand-5",
                "light-bw": "brand-1",
                "light-bold": "brand-5",
                dark: "brand-4",
                "dark-bw": "white",
                "dark-bold": "brand-3",
              },
              theme
            ),
            textSize: "xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "3xl",
          },
          desktop: {},
        },
        h4: {
          mobile: {
            textColor: getColor(
              {
                light: "brand-5",
                "light-bw": "brand-1",
                "light-bold": "brand-5",
                dark: "brand-4",
                "dark-bw": "white",
                "dark-bold": "brand-3",
              },
              theme
            ),
            textSize: "xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "2xl",
          },
          desktop: {},
        },
        p: {
          mobile: {
            textColor: getColor(
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
            textSize: "lg",
            lineHeight: "loose",
            mt: "2.5",
          },
          tablet: {
            textSize: "xl",
            mt: "3.5",
          },
          desktop: {},
        },
      },
      parentClasses: [
        {
          mobile: {
            mt: "10",
            mb: "5",
            mx: "5",
          },
          tablet: {
            mt: "20",
            mb: "10",
            mx: "10",
          },
          desktop: {},
        },
        {
          mobile: {
            maxWidth: "none",
            mx: "auto",
          },
          tablet: {
            maxWidth: "screen-lg",
          },
          desktop: {
            maxWidth: "screen-xl",
          },
        },
        {
          mobile: {
            px: "9",
            pt: "12",
            pb: "10",
            textAlign: "left",
            textWrap: "pretty",
            maxWidth: "none",
          },
          tablet: {
            px: "14",
          },
          desktop: {
            px: "32",
          },
        },
      ],
      markdownBody: `## add a catchy title here\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n[Try it now!](try) &nbsp; [Learn more](learn)\n`,
    },
  };
}

function getParagraphDefault(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  return {
    nodeType: "Pane",
    id: "", // Will be set when template is used
    parentId: "", // Will be set when template is used
    isDecorative: false,
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour: tailwindToHex(
      getColor(
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
      brand
    ),
    markdown: {
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: {
        h2: {
          mobile: {
            fontWeight: "bold",
            textColor: getColor(
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
            textSize: "3xl",
            lineHeight: "snug",
            fontFace: "action",
            pt: "9",
            pb: "2.5",
          },
          tablet: {
            textSize: "5xl",
            pt: "14",
            pb: "3.5",
          },
          desktop: {
            textSize: "6xl",
            pt: "20",
          },
        },
        p: {
          mobile: {
            textColor: getColor(
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
            textSize: "lg",
            lineHeight: "loose",
            py: "2.5",
          },
          tablet: {
            textSize: "xl",
            py: "3.5",
          },
          desktop: {},
        },
      },
      parentClasses: [
        {
          mobile: {
            mx: "5",
            mt: "8",
            mb: "16",
          },
          tablet: {
            mx: "10",
            mt: "10",
            mb: "20",
          },
          desktop: {},
        },
        {
          mobile: {
            maxWidth: "none",
            mx: "auto",
          },
          tablet: {
            maxWidth: "screen-lg",
          },
          desktop: {
            maxWidth: "screen-xl",
          },
        },
        {
          mobile: {
            textWrap: "balance",
          },
          tablet: {},
          desktop: {},
        },
      ],
      markdownBody: `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
    },
  };
}

function getSection(theme: Theme, brand: string, useOdd: boolean): TemplatePane {
  return {
    nodeType: "Pane",
    id: "", // Will be set when template is used
    parentId: "", // Will be set when template is used
    isDecorative: false,
    title: "Simple Pane",
    slug: "simple-pane",
    bgColour: tailwindToHex(
      getColor(
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
      brand
    ),
    markdown: {
      nodeType: "Markdown",
      id: "",
      parentId: "",
      type: "markdown",
      markdownId: "01JD2RGG95PMZ7E6V5MBX9Q3FJ",
      defaultClasses: {
        h2: {
          mobile: {
            fontWeight: "bold",
            textColor: getColor(
              {
                light: "brand-5",
                "light-bw": "brand-1",
                "light-bold": "brand-5",
                dark: "brand-4",
                "dark-bw": "brand-8",
                "dark-bold": "brand-3",
              },
              theme
            ),
            textSize: "3xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "5xl",
          },
          desktop: {
            textSize: "6xl",
          },
        },
        h3: {
          mobile: {
            fontWeight: "bold",
            textColor: getColor(
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
            textSize: "2xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "3xl",
          },
          desktop: {},
        },
        h4: {
          mobile: {
            textColor: getColor(
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
            textSize: "xl",
            fontFace: "action",
          },
          tablet: {
            textSize: "2xl",
          },
          desktop: {},
        },
        p: {
          mobile: {
            textColor: getColor(
              {
                light: "brand-7",
                "light-bw": "brand-1",
                "light-bold": "brand-7",
                dark: "brand-6",
                "dark-bw": "brand-2",
                "dark-bold": "brand-8",
              },
              theme
            ),
            textSize: "lg",
            py: "3",
          },
          tablet: {
            textSize: "xl",
          },
          desktop: {},
        },
      },
      parentClasses: [
        {
          mobile: {
            my: "12",
          },
          tablet: {},
          desktop: {},
        },
        {
          mobile: {
            maxWidth: "2xl",
            mx: "auto",
            px: "8",
            textAlign: "center",
          },
          tablet: {
            maxWidth: "3xl",
          },
          desktop: {},
        },
        {
          mobile: {
            textWrap: "balance",
          },
          tablet: {},
          desktop: {},
        },
      ],
      markdownBody: `## Section Title Here\n\nYour section intro text goes here - make it compelling!\n\n### An incredible journey awaits...\n\nAdd some details about what's coming up next.`,
    },
  };
}
