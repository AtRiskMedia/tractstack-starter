import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import PaintBrushIcon from "@heroicons/react/24/outline/PaintBrushIcon";
import Cog8ToothIcon from "@heroicons/react/24/outline/Cog8ToothIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import Square3Stack3DIcon from "@heroicons/react/24/outline/Square3Stack3DIcon";
import ArrowsUpDownIcon from "@heroicons/react/24/outline/ArrowsUpDownIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";

import type { ResourceSetting, Tag, ToolMode, ToolAddMode, GotoTargets, Theme } from "@/types.ts";
import type { SubmitParams } from "assemblyai";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
export const MS_BETWEEN_UNDO = 6000;
export const DB_DIR = ".tractstack";
export const DEMO_DB = "demo.db";
export const PROD_DB = "prod.db";
export const REPLICA_PREFIX = "replica-";
export const REPLICA_COUNT = 3;

export const genAiPrompt = `You are writing copy for a high traffic internet website. Write for an audience who is reading this website copy and is very interested in what it has to offer. Create a markdown summary of the given text following this structure: Start with a # Heading 1 web page title that's appropriate for SEO. Next a ## Heading 2 containing a catchy, concise title that encapsulates the main theme. Follow with a single paragraph that provides an overall short description, setting the context for the entire piece. Create 3-5 ### Heading 3 sections, each focusing on a key aspect or subtopic of the main theme. Each heading should be followed by one or two paragraphs expanding on that subtopic. Optionally, include a #### Heading 4 subsection under one or more of the ### Heading 3 sections if there's a need to dive deeper into a specific point. This should also be followed by one or two paragraphs. Ensure all content is in pure markdown format, without any HTML tags or special formatting. Adjust the number of sections and subsections based on the length and complexity of the original text: For shorter texts (under 500 words), use fewer sections. For longer texts (over 2000 words), use more sections and subsections. Keep the overall structure and flow coherent, ensuring each section logically leads to the next. Use paragraphs instead of bullet points or lists for the main content under each heading. Maintain a consistent tone and style throughout the summary, matching the original text's voice where appropriate. Aim for a comprehensive yet concise summary that captures the essence of the original text while adhering to this structured format.`;

export const WORDMARK_MODE = import.meta.env.PUBLIC_WORDMARK_MODE || "default";
export const ENABLE_HEADER_WIDGET = import.meta.env.ENABLE_HEADER_WIDGET === "true" || false;

export const MAX_HISTORY_LENGTH = 10;
export const MAX_LENGTH_CONTENT = 10000;

export const PUBLIC_THEME = `light-bold`;
export const themes: Theme[] = ["light", "light-bw", "light-bold", "dark", "dark-bw", "dark-bold"];

export const CONCIERGE_SYNC_INTERVAL = 4000;
export const THRESHOLD_READ = 42000;
export const THRESHOLD_GLOSSED = 7000;
export const JWT_LIFETIME = 15 * 60 * 1000;
export const IMPRESSIONS_DELAY = 5000;

export const ANALYTICS_CACHE_TTL = 15 * 60 * 1000;

export const collections = ["kCz"];

export const tagTitles: Record<Tag, string> = {
  p: "Paragraph",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  img: "Image",
  code: "Widget",
  li: `List Item`,
  ol: "Outer Container",
  ul: "Outer Container",
  parent: "Pane Styles",
  modal: "Modal Styles",
  signup: "Email Signup Widget",
  yt: "YouTube Widget",
  bunny: "Bunny Video Widget",
  belief: "Belief Select Widget",
  toggle: "Belief Toggle Widget",
  identify: "Identify As Widget",
};

export const toolAddModes = [
  "p",
  "h2",
  "h3",
  "h4",
  "img",
  "signup",
  "yt",
  "bunny",
  "belief",
  "identify",
  "toggle",
  //"aside",
] as const;

export const toolAddModeDefaultHeight: number = 60;

// all sizes in pixels. 0 or less than 0 means the code will use toolAddModeDefaultHeight
export const toolAddModesSizes: Record<ToolAddMode, number> = {
  p: 60,
  h2: 85,
  h3: 72,
  h4: 68,
  img: 140,
  yt: 0,
  bunny: 0,
  signup: 0,
  identify: 0,
  toggle: 0,
  belief: 0,
  //aside: 0,
};

export const toolAddModesIcons: Record<ToolAddMode, string> = {
  p: "text.svg",
  h2: "h2.svg",
  h3: "h3.svg",
  h4: "h4.svg",
  img: "image.svg",
  yt: "",
  bunny: "",
  signup: "",
  identify: "",
  toggle: "",
  belief: "",
  //aside: "",
};

export const toolAddModeTitles: Record<ToolAddMode, string> = {
  p: "Paragraph",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  img: "Image",
  signup: "Email Sign-up Widget",
  yt: "YouTube Video",
  bunny: "Bunny Video",
  belief: "Belief Select",
  identify: "Identity As",
  toggle: "Toggle Belief",
  //aside: "Aside Text",
};

export const toolAddModeInsertDefault: Record<ToolAddMode, string> = {
  p: "...",
  h2: "## title",
  h3: "### subtitle",
  h4: "#### section title",
  img: "![Descriptive title](filename)", // on initial insert must wrap in ul
  signup: "* `signup(Major Updates Only|Keep in touch!|false)`",
  yt: "* `youtube(tag|title)`",
  bunny: "* `bunny(id|title)`",
  belief: "* `belief(BeliefTag|likert|prompt)`",
  identify: "* `identifyAs(BeliefTag|TARGET_VALUE|prompt)`",
  toggle: "* `toggle(BeliefTag|prompt)`",
  //aside: "...", // on initial insert must wrap in ol
};

export const toolModes: ToolMode[] = ["text", "styles", "insert", "settings", "eraser", "pane"];

export const toolModeButtons = [
  {
    key: "text" as const,
    Icon: PencilIcon,
    title: "Edit text",
  },
  {
    key: "styles" as const,
    Icon: PaintBrushIcon,
    title: "Edit styles",
  },
  // {
  //   key: "insert" as const,
  //   Icon: PlusCircleIcon,
  //   title: "Insert element",
  // },
  {
    key: "eraser" as const,
    Icon: TrashIcon,
    title: "Erase element",
  },
  {
    key: "pane" as const,
    Icon: Square3Stack3DIcon,
    title: "Insert Pane",
  },
  {
    key: "settings" as const,
    Icon: Cog8ToothIcon,
    title: "Edit settings",
  },
] as const;

// Add these new interfaces to the existing constants.ts file
// Place these with the other interface definitions

interface WidgetParameterDefinition {
  label: string;
  defaultValue: string;
  type: "string" | "boolean" | "scale" | "multi-string";
  isBeliefTag?: boolean;
}

interface WidgetMeta {
  [key: string]: {
    title: string;
    parameters: WidgetParameterDefinition[];
    isBelief?: boolean;
  };
}

// Replace the existing widgetMeta object with this updated version
export const widgetMeta: WidgetMeta = {
  belief: {
    title: `Belief Widget`,
    parameters: [
      { label: "Belief Tag", defaultValue: "BELIEF", type: "string", isBeliefTag: true },
      { label: "Scale", defaultValue: "yn", type: "scale" },
      { label: "Question Prompt", defaultValue: "Prompt", type: "string" },
    ],
    isBelief: true,
  },
  identifyAs: {
    title: `Identify As Widget`,
    parameters: [
      { label: "Belief Tag", defaultValue: "BELIEF", type: "string", isBeliefTag: true },
      { label: "Belief Matching Value(s)", defaultValue: "*", type: "multi-string" },
      { label: "Question Prompt", defaultValue: "Prompt", type: "string" },
    ],
    isBelief: true,
  },
  toggle: {
    title: `Toggle Belief Widget`,
    parameters: [
      { label: "Belief Tag", defaultValue: "BELIEF", type: "string", isBeliefTag: true },
      { label: "Question Prompt", defaultValue: "Prompt", type: "string" },
    ],
    isBelief: true,
  },
  youtube: {
    title: `YouTube Video Embed`,
    parameters: [
      { label: "Embed Code", defaultValue: "*", type: "string" },
      { label: "Title", defaultValue: "Descriptive Title", type: "string" },
    ],
  },
  bunny: {
    title: `BunnyCDN Video Embed`,
    parameters: [
      { label: "Embed URL", defaultValue: "*", type: "string" },
      { label: "Title", defaultValue: "Descriptive Title", type: "string" },
    ],
  },
  resource: {
    title: `Not yet implemented`,
    parameters: [
      { label: "Type", defaultValue: "?", type: "string" },
      { label: "Variation", defaultValue: "?", type: "string" },
    ],
  },
  signup: {
    title: `Email Sign Up Widget`,
    parameters: [
      { label: "Contact Persona", defaultValue: "Major Updates Only", type: "string" },
      { label: "Prompt Text", defaultValue: "Keep in touch!", type: "string" },
      { label: "Clarify Consent", defaultValue: "false", type: "boolean" },
    ],
  },
};

export const knownBrand: Record<string, string> = {
  default: "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
  monet: "0f1912,f6f4f3,cfae97,ded2c3,24423c,a8cd20,452a3d,f3f5f6",
  dali: "150c02,fffef9,e2e5d4,fef6d1,4b3703,dddcca,382c0d,fefcee",
  hiphop: "0d0d09,faf7f3,ffd201,a3bfd4,39304d,f6e5ce,3c2a25,f0e7d5",
  grey: "101010,f0f0f0,888888,aaaaaa,333333,bbbbbb,444444,dddddd",
};

export const reservedSlugs = [
  `api`,
  `create`,
  `edit`,
  `concierge`,
  `context`,
  `products`,
  `storykeep`,
  `cart`,
  `404`,
  `transcribe`,
  `sitemap`,
  `robots`,
];

// Helper function to validate and process a resource value based on its type
export function processResourceValue(
  key: string,
  /* eslint-disable @typescript-eslint/no-explicit-any */
  value: any,
  setting: ResourceSetting
): any {
  if (key in setting) {
    const { type, defaultValue } = setting[key];
    switch (type) {
      case "string":
        return typeof value === "string" ? value : (defaultValue ?? "");
      case "boolean":
        return typeof value === "boolean" ? value : (defaultValue ?? false);
      case "number":
        return typeof value === "number" ? value : (defaultValue ?? 0);
      case "date":
        return typeof value === "number"
          ? new Date(value * 1000).toISOString()
          : (defaultValue ?? "");
      default:
        return value;
    }
  }
  return value;
}

//
// Transcribe
//
export const DOUBLE_CLICK_THRESHOLD = 200;

export const transcribeParams: Partial<SubmitParams> = {
  auto_highlights: true,
  auto_chapters: true,
};

export const GOTO_TARGETS: GotoTargets = {
  storykeep: {
    name: "StoryKeep",
    subcommands: ["dashboard", "settings", "login", "logout"],
    description: "Navigate to StoryKeep sections",
  },
  home: {
    name: "Home Page",
    description: "Navigate to the home page",
  },
  concierge: {
    name: "Concierge",
    subcommands: ["profile"],
    description: "Navigate to concierge sections",
  },
  context: {
    name: "Context",
    requiresParam: true,
    paramLabel: "Context Slug",
    description: "Navigate to a context page",
  },
  storyFragment: {
    name: "Story Fragment",
    requiresParam: true,
    paramLabel: "StoryFragment Slug",
    description: "Navigate to a story fragment",
  },
  storyFragmentPane: {
    name: "Story Fragment Pane",
    requiresParam: true,
    requiresSecondParam: true,
    paramLabel: "StoryFragment Slug",
    param2Label: "Pane Slug",
    description: "Navigate to specific pane in a story fragment",
  },
  bunny: {
    name: "Goto Bunny Video",
    requiresParam: true,
    requiresSecondParam: true,
    requiresThirdParam: true,
    paramLabel: "StoryFragment Slug",
    param2Label: "Time (seconds)",
    param3Label: "Video ID",
    description: "Play a Bunny video at specified time",
  },
  url: {
    name: "External URL",
    requiresParam: true,
    paramLabel: "URL",
    description: "Navigate to external URL",
    placeholder: "https://...",
  },
};

export const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "but",
  "if",
  "or",
  "because",
  "as",
  "until",
  "while",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
]);

export const storykeepToolModes = [
  {
    key: "default" as const,
    Icon: PaintBrushIcon,
    title: "Styles",
    description: "Click to edit styles",
  },
  {
    key: "text" as const,
    Icon: PencilIcon,
    title: "Write",
    description: "Click to edit text",
  },
  {
    key: "insert" as const,
    Icon: PlusIcon,
    title: "Add *",
    description: "Add new element, e.g. paragraph or image",
  },
  {
    key: "eraser" as const,
    Icon: TrashIcon,
    title: "Eraser",
    description: "Erase any element(s)",
  },
  //{
  //  key: "pane" as const,
  //  Icon: Square3Stack3DIcon,
  //  title: "Insert Pane here",
  //},
  {
    key: "move" as const,
    Icon: ArrowsUpDownIcon,
    title: "Move *",
    description: "Keyboard accessible re-order",
  },
  //{
  //  key: "layout" as const,
  //  Icon: PuzzlePieceIcon,
  //  title: "Auto-layout design",
  //},
  //{
  //  key: "markdown" as const,
  //  Icon: BoltIcon,
  //  title: "Edit plain text",
  //},
] as const;
