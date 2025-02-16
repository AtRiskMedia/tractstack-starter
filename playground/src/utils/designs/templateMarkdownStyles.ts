import { ulid } from "ulid";
import { getColor, tailwindToHex } from "@/utils/tailwind/tailwindColors";
import type { Theme, TemplatePane, ParentClassesPayload } from "@/types";

const defaultMarkdownBody = `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!\n\nCapture attention and make moves.`;
const defaultSectionBody = `### An incredible journey awaits... An incredible journey awaits... An incredible journey awaits...`;
const defaultIntroBody = `## An incredible journey awaits\n\nAn incredible journey awaits... An incredible journey awaits...`;
const defaultImageHeroBody = `1. ## An incredible journey awaits\n\n* ![Placeholder image](/static.jpg)\n`;

export const templateCategories = [
  {
    id: "all",
    title: "All designs",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      ...templateCategories[1].getTemplates(theme, brand, useOdd),
      ...templateCategories[2].getTemplates(theme, brand, useOdd),
      ...templateCategories[3].getTemplates(theme, brand, useOdd),
      ...templateCategories[4].getTemplates(theme, brand, useOdd),
    ],
  },
  {
    id: "paragraph",
    title: "Tell your story",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getJustCopyDesign(theme, brand, useOdd, false, `default`),
      getJustCopyDesign(theme, brand, useOdd, true, `default`),
      getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
      getJustCopyDesign(theme, brand, useOdd, true, `onecol`),
      getJustCopyDesign(theme, brand, useOdd, false, `center`),
      getJustCopyDesign(theme, brand, useOdd, true, `center`),
    ],
  },
  {
    id: "intro",
    title: "Page Intro sections",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getIntroDesign(theme, brand, useOdd, false, `default`),
      getIntroDesign(theme, brand, useOdd, true, `default`),
      getIntroDesign(theme, brand, useOdd, false, `onecol`),
      getIntroDesign(theme, brand, useOdd, true, `onecol`),
      getIntroDesign(theme, brand, useOdd, false, `center`),
      getIntroDesign(theme, brand, useOdd, true, `center`),
    ],
  },
  {
    id: "section",
    title: "Sub-title sections",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getSubTitleDesign(theme, brand, useOdd, false, `default`),
      getSubTitleDesign(theme, brand, useOdd, true, `default`),
      getSubTitleDesign(theme, brand, useOdd, false, `onecol`),
      getSubTitleDesign(theme, brand, useOdd, true, `onecol`),
      getSubTitleDesign(theme, brand, useOdd, false, `center`),
      getSubTitleDesign(theme, brand, useOdd, true, `center`),
      getSubTitleDesign(theme, brand, useOdd, false, `default-brand`),
      getSubTitleDesign(theme, brand, useOdd, false, `onecol-brand`),
      getSubTitleDesign(theme, brand, useOdd, false, `center-brand`),
    ],
  },
  {
    id: "image-hero",
    title: "Image Hero Section",
    getTemplates: (theme: Theme, brand: string, useOdd: boolean) => [
      getImageHeroSectionDefault(theme, brand, useOdd),
      getImageHeroSectionDefault(theme, brand, useOdd, true),
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
      pt: "6",
      pb: "2.5",
    },
    tablet: {
      textSIZE: "5xl",
      pt: "9",
      pb: "3.5",
    },
    desktop: {
      textSIZE: "6xl",
      pt: "12",
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
      pt: "6",
      pb: "2.5",
    },
    tablet: {
      textSIZE: "3xl",
      pt: "9",
      pb: "3.5",
    },
    desktop: {
      pt: "12",
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

export function getJustCopyDesign(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  bordered: boolean = false,
  variant: string = `default`
): TemplatePane {
  let title = "";
  let slug = "";
  const baseClasses = getBaseParentClasses();
  switch (variant) {
    case `onecol`: {
      title = !bordered ? "Copy goes here - one column" : "Copy goes here with border - one column";
      slug = !bordered ? "paragraph-onecol" : "paragraph-onecol-bordered";
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
      break;
    }

    case `center`: {
      title = !bordered ? "Copy goes here - centered" : "Copy goes here with border - centered";
      slug = !bordered ? "paragraph-centered" : "paragraph-centered-bordered";
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
      break;
    }

    default: {
      title = !bordered ? "Copy goes here" : "Copy goes here with border";
      slug = !bordered ? "paragraph-default" : "paragraph-default-bordered";
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
    }
  }

  return {
    nodeType: "Pane",
    title,
    slug,
    id: "",
    parentId: "",
    isDecorative: false,
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

export function getSubTitleDesign(
  theme: Theme,
  brand: string,
  useOdd: boolean,
  bordered: boolean = false,
  variant: string = `default`
): TemplatePane {
  const baseClasses = getBaseParentClasses();
  let title = "";
  let slug = "";
  let bgColour = "";
  let textCOLOR = "";

  switch (variant) {
    case `onecol`: {
      title = !bordered ? "Title section One Column" : "Title section one column with border";
      slug = !bordered ? "section-onecol" : "section-onecol-bordered";
      textCOLOR = getColor(
        {
          light: "black",
          "light-bw": "black",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "brand-8",
          "dark-bold": "brand-3",
        },
        theme
      );
      bgColour = tailwindToHex(
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
      );
      baseClasses[2].mobile.textALIGN = "left";
      baseClasses[2].mobile.textWRAP = "pretty";
      baseClasses[2].mobile.maxW = "3xl";
      if (bordered) {
        baseClasses[2].mobile.shadow = "md";
      }
      break;
    }

    case `center`: {
      title = !bordered ? "Title section centered" : "Title section centered with border";
      slug = !bordered ? "section-center" : "section-center-bordered";
      textCOLOR = getColor(
        {
          light: "black",
          "light-bw": "black",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "brand-8",
          "dark-bold": "brand-3",
        },
        theme
      );
      bgColour = tailwindToHex(
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
      );
      baseClasses[2].mobile.textALIGN = "center";
      baseClasses[2].mobile.textWRAP = "balance";
      if (bordered) {
        baseClasses[2].mobile.shadow = "md";
      }
      break;
    }

    case `onecol-brand`: {
      (title = "Title section v2 one column"),
        (slug = "section-onecol-brand"),
        (textCOLOR = getColor(
          {
            light: "black",
            "light-bw": "black",
            "light-bold": "black",
            dark: "black",
            "dark-bw": "black",
            "dark-bold": "black",
          },
          theme
        ));
      bgColour = tailwindToHex(
        getColor(
          {
            light: !useOdd ? "brand-3" : "brand-4",
            "light-bw": !useOdd ? "brand-3" : "brand-4",
            "light-bold": !useOdd ? "brand-3" : "brand-4",
            dark: !useOdd ? "brand-3" : "brand-4",
            "dark-bw": !useOdd ? "brand-3" : "brand-4",
            "dark-bold": !useOdd ? "brand-3" : "brand-4",
          },
          theme
        ),
        brand
      );
      baseClasses[2].mobile.textALIGN = "left";
      baseClasses[2].mobile.textWRAP = "pretty";
      baseClasses[2].mobile.maxW = "3xl";
      if (bordered) {
        baseClasses[2].mobile.shadow = "md";
      }
      break;
    }

    case `center-brand`: {
      (title = "Title section v2 centered"),
        (slug = "section-center-brand"),
        (textCOLOR = getColor(
          {
            light: "black",
            "light-bw": "black",
            "light-bold": "black",
            dark: "black",
            "dark-bw": "black",
            "dark-bold": "black",
          },
          theme
        ));
      bgColour = tailwindToHex(
        getColor(
          {
            light: !useOdd ? "brand-3" : "brand-4",
            "light-bw": !useOdd ? "brand-3" : "brand-4",
            "light-bold": !useOdd ? "brand-3" : "brand-4",
            dark: !useOdd ? "brand-3" : "brand-4",
            "dark-bw": !useOdd ? "brand-3" : "brand-4",
            "dark-bold": !useOdd ? "brand-3" : "brand-4",
          },
          theme
        ),
        brand
      );
      baseClasses[2].mobile.textALIGN = "center";
      baseClasses[2].mobile.textWRAP = "balance";
      if (bordered) {
        baseClasses[2].mobile.shadow = "md";
      }
      break;
    }

    case `default-brand`: {
      (title = "Title section v2"),
        (slug = "section-default-brand"),
        (textCOLOR = getColor(
          {
            light: "black",
            "light-bw": "black",
            "light-bold": "black",
            dark: "black",
            "dark-bw": "black",
            "dark-bold": "black",
          },
          theme
        ));
      bgColour = tailwindToHex(
        getColor(
          {
            light: !useOdd ? "brand-3" : "brand-4",
            "light-bw": !useOdd ? "brand-3" : "brand-4",
            "light-bold": !useOdd ? "brand-3" : "brand-4",
            dark: !useOdd ? "brand-3" : "brand-4",
            "dark-bw": !useOdd ? "brand-3" : "brand-4",
            "dark-bold": !useOdd ? "brand-3" : "brand-4",
          },
          theme
        ),
        brand
      );
      baseClasses[2].mobile.textALIGN = "left";
      baseClasses[2].mobile.textWRAP = "pretty";
      if (bordered) {
        baseClasses[2].mobile.shadow = "md";
      }
      break;
    }

    default: {
      title = !bordered ? "Title section" : "Title section with border";
      slug = !bordered ? "section-default" : "section-default-bordered";
      textCOLOR = getColor(
        {
          light: "black",
          "light-bw": "black",
          "light-bold": "brand-5",
          dark: "brand-4",
          "dark-bw": "brand-8",
          "dark-bold": "brand-3",
        },
        theme
      );
      bgColour = tailwindToHex(
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
      );
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
    }
  }

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title,
    slug,
    bgColour,
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
            textCOLOR,
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
            textCOLOR,
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
            textCOLOR,
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
            textCOLOR,
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
      parentClasses: baseClasses,
      markdownBody: defaultSectionBody,
    },
  };
}

const getBaseIntroClasses = (theme: Theme) => ({
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
      textSIZE: "4xl",
    },
    desktop: {
      textSIZE: "5xl",
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
      lineHEIGHT: "snug",
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
      lineHEIGHT: "snug",
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
      mt: "4",
    },
    tablet: {
      textSIZE: "xl",
      mt: "5",
    },
    desktop: {},
  },
});

const getIntroBaseParentClasses = (): ParentClassesPayload => [
  {
    mobile: {
      mx: "5",
      mt: "16",
      mb: "16",
    },
    tablet: {
      mx: "10",
      mt: "20",
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

export const getIntroDesign = (
  theme: Theme,
  brand: string,
  useOdd: boolean = false,
  bordered: boolean = false,
  variant: string = `default`
): TemplatePane => {
  const parentClasses = getIntroBaseParentClasses();
  let title = "";
  let slug = "";
  switch (variant) {
    case `center`: {
      (title = !bordered ? "Intro section centered" : "Intro section centered with border"),
        (slug = !bordered ? "intro-centered" : "intro-centered-bordered"),
        (parentClasses[2].mobile.textALIGN = "center");
      parentClasses[2].mobile.textWRAP = "balance";
      if (bordered) {
        parentClasses[2].mobile.bgCOLOR = getColor(
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
        parentClasses[2].mobile.shadow = "lg";
      }
      break;
    }

    case `onecol`: {
      (title = !bordered ? "Intro section one column" : "Intro section one column with border"),
        (slug = !bordered ? "intro-onecol" : "intro-onecol-bordered"),
        (parentClasses[2].mobile.textALIGN = "left");
      parentClasses[2].mobile.textWRAP = "pretty";
      parentClasses[2].mobile.maxW = "3xl";
      if (bordered) {
        parentClasses[2].mobile.bgCOLOR = getColor(
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
        parentClasses[2].mobile.shadow = "lg";
      }
      break;
    }

    default: {
      (title = !bordered ? "Intro section" : "Intro section with border"),
        (slug = !bordered ? "intro-default" : "intro-default-bordered"),
        (parentClasses[2].mobile.textALIGN = "left");
      parentClasses[2].mobile.textWRAP = "pretty";
      if (bordered) {
        parentClasses[2].mobile.bgCOLOR = getColor(
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
        parentClasses[2].mobile.shadow = "lg";
      }
    }
  }

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title,
    slug,
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
      defaultClasses: getBaseIntroClasses(theme),
      parentClasses,
      markdownBody: defaultIntroBody,
    },
  };
};

export const getImageHeroSectionDefault = (
  theme: Theme,
  brand: string,
  useOdd: boolean = false,
  bordered: boolean = false
): TemplatePane => {
  const parentClasses = getImageHeroBaseParentClasses();
  parentClasses[2].mobile.textALIGN = "left";
  parentClasses[2].mobile.textWRAP = "pretty";
  if (bordered) {
    parentClasses[2].mobile.bgCOLOR = getColor(
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
    parentClasses[2].mobile.shadow = "lg";
  }

  return {
    nodeType: "Pane",
    id: "",
    parentId: "",
    isDecorative: false,
    title: !bordered ? "Hero Image section" : "Hero Image section with border",
    slug: "intro-default",
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
      defaultClasses: getBaseImageHeroClasses(theme),
      parentClasses,
      markdownBody: defaultImageHeroBody,
    },
  };
};

const getBaseImageHeroClasses = (theme: Theme) => ({
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
      mb: "4",
      maxW: "2xl",
    },
    tablet: {
      textSIZE: "4xl",
      mb: "6",
    },
    desktop: {
      textSIZE: "5xl",
      mb: "8",
    },
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
      lineHEIGHT: "relaxed",
      maxW: "xl",
      mb: "6",
    },
    tablet: {
      textSIZE: "xl",
      mb: "8",
    },
    desktop: {
      maxW: "2xl",
      mb: "10",
    },
  },
  li: {
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
      textSIZE: "4xl",
    },
    desktop: {
      textSIZE: "5xl",
    },
  },
  img: {
    mobile: {
      objectFIT: "cover",
      mx: "auto",
    },
    tablet: {
      maxH: "none",
      h: "full",
    },
    desktop: {
      w: "1/2",
      borderL: "8",
      borderCOLOR: "brand-3",
    },
  },
});

const getImageHeroBaseParentClasses = (): ParentClassesPayload => [
  ...getIntroBaseParentClasses(),
  {
    mobile: {
      display: "flex",
      flexDIRECTION: "col",
      gap: "8",
      p: "6",
    },
    tablet: {
      p: "12",
      gap: "12",
    },
    desktop: {
      flexDIRECTION: "row",
      items: "center",
      justify: "between",
      gap: "0",
      overflow: "hidden",
      p: "0",
    },
  },
];
