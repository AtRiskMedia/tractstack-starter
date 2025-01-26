import { ulid } from "ulid";
import { getColor, tailwindToHex } from "@/utils/tailwind/tailwindColors";
import type { Theme, TemplatePane, ParentClassesPayload } from "@/types";

const defaultMarkdownBody = `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!\n\nCapture attention and make moves.`;
const defaultSectionBody = `### An incredible journey awaits... An incredible journey awaits... An incredible journey awaits...`;

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
    id: "paragraph",
    title: "Just copy",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getParagraphDefault(theme, brand, useOdd),
      getParagraphOneColumn(theme, brand, useOdd),
      getParagraphCenter(theme, brand, useOdd),
    ],
  },
  {
    id: "paragraph-bordered",
    title: "Just copy (bordered)",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getParagraphDefault(theme, brand, useOdd, true),
      getParagraphOneColumn(theme, brand, useOdd, true),
      getParagraphCenter(theme, brand, useOdd, true),
    ],
  },
  {
    id: "section",
    title: "Section title",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getSectionDefault(theme, brand, useOdd),
      getSectionDefault(theme, brand, useOdd, true),
      getSectionInverse(theme, brand, useOdd),
      getSectionInverse(theme, brand, useOdd, true),
      getSectionBrand(theme, brand, useOdd),
      getSectionBrand(theme, brand, useOdd, true),
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
      pt: "9",
      pb: "2.5",
    },
    tablet: {
      textSIZE: "5xl",
      pt: "14",
      pb: "3.5",
    },
    desktop: {
      textSIZE: "6xl",
      pt: "20",
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
      pt: "9",
      pb: "2.5",
    },
    tablet: {
      textSIZE: "3xl",
      pt: "14",
      pb: "3.5",
    },
    desktop: {
      pt: "20",
    },
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
      pt: "4",
      pb: "1.5",
    },
    tablet: {
      textSIZE: "2xl",
      pt: "6",
      pb: "2.5",
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
    },
    tablet: {
      textSIZE: "xl",
    },
    desktop: {},
  },
});

const getBaseParentClasses = (): ParentClassesPayload => {
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

function getParagraphDefault(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  bordered: boolean = false
): TemplatePane {
  const baseClasses = getBaseParentClasses();
  baseClasses[2].mobile.textALIGN = "left";
  baseClasses[2].mobile.textWRAP = "pretty";
  if (bordered) {
    baseClasses[2].mobile.bgCOLOR = getColor(
      {
        light: useOdd ? "brand-2" : "white",
        "light-bw": useOdd ? "white" : "brand-2",
        "light-bold": useOdd ? "brand-2" : "white",
        dark: useOdd ? "black" : "brand-1",
        "dark-bw": useOdd ? "black" : "brand-1",
        "dark-bold": useOdd ? "brand-1" : "black",
      },
      theme
    );
    baseClasses[2].mobile.shadow = "md";
  }

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
      markdownId: ulid(),
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: defaultMarkdownBody,
    },
  };
}

function getParagraphCenter(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  bordered: boolean = false
): TemplatePane {
  const baseClasses = getBaseParentClasses();
  baseClasses[2].mobile.textALIGN = "center";
  baseClasses[2].mobile.textWRAP = "balance";
  if (bordered) {
    baseClasses[2].mobile.bgCOLOR = getColor(
      {
        light: useOdd ? "brand-2" : "white",
        "light-bw": useOdd ? "white" : "brand-2",
        "light-bold": useOdd ? "brand-2" : "white",
        dark: useOdd ? "black" : "brand-1",
        "dark-bw": useOdd ? "black" : "brand-1",
        "dark-bold": useOdd ? "brand-1" : "black",
      },
      theme
    );
    baseClasses[2].mobile.shadow = "md";
  }

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
      markdownId: ulid(),
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: defaultMarkdownBody,
    },
  };
}

function getParagraphOneColumn(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  bordered: boolean = false
): TemplatePane {
  const baseClasses = getBaseParentClasses();
  baseClasses[2].mobile.textALIGN = "left";
  baseClasses[2].mobile.textWRAP = "pretty";
  baseClasses[2].mobile.maxW = "3xl";
  if (bordered) {
    baseClasses[2].mobile.bgCOLOR = getColor(
      {
        light: useOdd ? "brand-2" : "white",
        "light-bw": useOdd ? "white" : "brand-2",
        "light-bold": useOdd ? "brand-2" : "white",
        dark: useOdd ? "black" : "brand-1",
        "dark-bw": useOdd ? "black" : "brand-1",
        "dark-bold": useOdd ? "brand-1" : "black",
      },
      theme
    );
    baseClasses[2].mobile.shadow = "md";
  }

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
      markdownId: ulid(),
      defaultClasses: getBaseParagraphClasses(theme),
      parentClasses: baseClasses,
      markdownBody: defaultMarkdownBody,
    },
  };
}

const sectionParentClasses = [
  {
    mobile: {
      my: "12",
    },
    tablet: {
      my: "16",
    },
    desktop: {},
  },
  {
    mobile: {
      maxW: "2xl",
      mx: "auto",
      px: "8",
      textALIGN: "center",
    },
    tablet: {
      maxW: "3xl",
    },
    desktop: {
      maxW: "5xl",
    },
  },
] as ParentClassesPayload;
const sectionExtraParentClasses = [
  {
    mobile: {
      mx: "5",
      my: "16",
    },
    tablet: {
      maxW: "3xl",
      mx: "10",
    },
    desktop: {
      maxW: "5xl",
    },
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
] as ParentClassesPayload;

function getSectionDefault(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  extra: boolean = false
): TemplatePane {
  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Section title",
    slug: "section",
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
      markdownId: ulid(),
      defaultClasses: {
        h2: {
          mobile: {
            fontWEIGHT: "bold",
            textCOLOR: getColor(
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
            textSIZE: "3xl",
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
            textSIZE: "2xl",
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
                dark: "brand-6",
                "dark-bw": "brand-2",
                "dark-bold": "brand-8",
              },
              theme
            ),
            textSIZE: "lg",
            py: "3",
          },
          tablet: {
            textSIZE: "xl",
            py: "4",
          },
          desktop: {},
        },
      },
      parentClasses: !extra ? sectionParentClasses : sectionExtraParentClasses,
      markdownBody: defaultSectionBody,
    },
  };
}

function getSectionInverse(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  extra: boolean = false
): TemplatePane {
  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Section title - Inverse",
    slug: "sectioninverse",
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? "black" : "brand-1",
          "light-bw": !useOdd ? "black" : "brand-1",
          "light-bold": !useOdd ? "brand-1" : "black",
          dark: !useOdd ? "brand-2" : "white",
          "dark-bw": !useOdd ? "white" : "brand-2",
          "dark-bold": !useOdd ? "brand-2" : "white",
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
      markdownId: ulid(),
      defaultClasses: {
        h2: {
          mobile: {
            fontWEIGHT: "bold",
            textCOLOR: getColor(
              {
                light: "brand-4",
                "light-bw": "brand-8",
                "light-bold": "brand-3",
                dark: "brand-5",
                "dark-bw": "brand-1",
                "dark-bold": "brand-5",
              },
              theme
            ),
            textSIZE: "3xl",
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
                light: "brand-4",
                "light-bw": "white",
                "light-bold": "brand-3",
                dark: "brand-7",
                "dark-bw": "brand-1",
                "dark-bold": "brand-5",
              },
              theme
            ),
            textSIZE: "2xl",
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
                light: "brand-4",
                "light-bw": "white",
                "light-bold": "brand-3",
                dark: "brand-7",
                "dark-bw": "brand-1",
                "dark-bold": "brand-5",
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
                light: "brand-6",
                "light-bw": "brand-2",
                "light-bold": "brand-8",
                dark: "brand-7",
                "dark-bw": "brand-1",
                "dark-bold": "brand-7",
              },
              theme
            ),
            textSIZE: "lg",
            py: "3",
            textWRAP: "balance",
          },
          tablet: {
            textSIZE: "xl",
            py: "4",
          },
          desktop: {},
        },
      },
      parentClasses: !extra ? sectionParentClasses : sectionExtraParentClasses,
      markdownBody: defaultSectionBody,
    },
  };
}

function getSectionBrand(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  extra: boolean = false
): TemplatePane {
  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: "Section title - Brand Colours",
    slug: "sectionbrand",
    bgColour: tailwindToHex(
      getColor(
        {
          light: !useOdd ? "brand-3" : "brand-4",
          "light-bw": !useOdd ? "brand-3" : "brand-4",
          "light-bold": !useOdd ? "brand-4" : "brand-3",
          dark: !useOdd ? "brand-3" : "brand-4",
          "dark-bw": !useOdd ? "brand-3" : "brand-4",
          "dark-bold": !useOdd ? "brand-4" : "brand-3",
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
      markdownId: ulid(),
      defaultClasses: {
        h2: {
          mobile: {
            fontWEIGHT: "bold",
            textCOLOR: getColor(
              {
                light: "brand-1",
                "light-bw": "white",
                "light-bold": "black",
                dark: "brand-2",
                "dark-bw": "white",
                "dark-bold": "black",
              },
              theme
            ),
            textSIZE: "3xl",
            fontFACE: "action",
            textWRAP: "balance",
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
                light: "brand-1",
                "light-bw": "white",
                "light-bold": "black",
                dark: "brand-2",
                "dark-bw": "white",
                "dark-bold": "black",
              },
              theme
            ),
            textSIZE: "2xl",
            fontFACE: "action",
            textWRAP: "balance",
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
                light: "brand-1",
                "light-bw": "white",
                "light-bold": "black",
                dark: "brand-2",
                "dark-bw": "white",
                "dark-bold": "black",
              },
              theme
            ),
            textSIZE: "xl",
            fontFACE: "action",
            textWRAP: "balance",
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
                light: "brand-1",
                "light-bw": "white",
                "light-bold": "black",
                dark: "brand-2",
                "dark-bw": "white",
                "dark-bold": "black",
              },
              theme
            ),
            textSIZE: "lg",
            py: "3",
            textWRAP: "balance",
          },
          tablet: {
            textSIZE: "xl",
            py: "4",
          },
          desktop: {},
        },
      },
      parentClasses: !extra ? sectionParentClasses : sectionExtraParentClasses,
      markdownBody: defaultSectionBody,
    },
  };
}
