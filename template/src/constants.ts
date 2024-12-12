import PencilIcon from "@heroicons/react/24/outline/PencilIcon";
import PaintBrushIcon from "@heroicons/react/24/outline/PaintBrushIcon";
import Cog8ToothIcon from "@heroicons/react/24/outline/Cog8ToothIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import PlusCircleIcon from "@heroicons/react/24/outline/PlusCircleIcon";
import Square3Stack3DIcon from "@heroicons/react/24/outline/Square3Stack3DIcon";
import type { Tag, ToolMode, ToolAddMode } from "./types";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
export const MS_BETWEEN_UNDO = 6000;
export const MAX_HISTORY_LENGTH = 10;
export const MAX_LENGTH_CONTENT = 10000;

export const PUBLIC_THEME = `light-bold`;

export const SHORT_SCREEN_THRESHOLD = 900;
export const SMALL_SCREEN_WIDTH = 600;
export const MIN_SCROLL_THRESHOLD = 220;
export const HYSTERESIS = 200;

export const CONCIERGE_SYNC_INTERVAL = 4000;
export const THRESHOLD_READ = 42000;
export const THRESHOLD_GLOSSED = 7000;
export const JWT_LIFETIME = 15 * 60 * 1000;
export const IMPRESSIONS_DELAY = 5000;

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
];

export const knownBrand: Record<string, string> = {
  default: "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
  monet: "0f1912,f6f4f3,cfae97,ded2c3,24423c,a8cd20,452a3d,f3f5f6",
  dali: "150c02,fffef9,e2e5d4,fef6d1,4b3703,dddcca,382c0d,fefcee",
  hiphop: "0d0d09,faf7f3,ffd201,a3bfd4,39304d,f6e5ce,3c2a25,f0e7d5",
  grey: "101010,f0f0f0,888888,aaaaaa,333333,bbbbbb,444444,dddddd",
};

export const tagTitles: Record<Tag, string> = {
  p: "Paragraph",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  img: "Image",
  code: "Widget",
  li: `List Item`,
  ol: "Outer Container",
  ul: "Outer Container",
  parent: "Pane Styles",
  modal: "Modal Styles",
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
  "aside",
] as const;

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
  aside: "Aside Text",
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
  aside: "...", // on initial insert must wrap in ol
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
  {
    key: "insert" as const,
    Icon: PlusCircleIcon,
    title: "Insert element",
  },
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

interface WidgetMeta {
  [key: string]: {
    title: string;
    valueLabels: string[];
    valueDefaults: string[];
    multi: boolean[];
    isScale: boolean[];
  };
}

export const widgetMeta: WidgetMeta = {
  belief: {
    title: `Belief Widget`,
    valueLabels: ["Belief Tag", "Scale", "Question Prompt"],
    valueDefaults: ["BELIEF", "yn", "Prompt"],
    multi: [false, false, false],
    isScale: [false, true, false],
  },
  identifyAs: {
    title: `Identify As Widget`,
    valueLabels: ["Belief Tag", "Belief Matching Value(s)", "Question Prompt"],
    valueDefaults: ["BELIEF", "*", "Prompt"],
    multi: [false, true, false],
    isScale: [false, false, false],
  },
  toggle: {
    title: `Toggle Belief Widget`,
    valueLabels: ["Belief Tag", "Question Prompt"],
    valueDefaults: ["BELIEF", "Prompt"],
    multi: [false, false],
    isScale: [false, false],
  },
  youtube: {
    title: `YouTube Video Embed`,
    valueLabels: ["Embed Code", "Title"],
    valueDefaults: ["*", "Descriptive Title"],
    multi: [false, false],
    isScale: [false, false],
  },
  bunny: {
    title: `BunnyCDN Video Embed`,
    valueLabels: ["Embed Code", "Title"],
    valueDefaults: ["*", "Descriptive Title"],
    multi: [false, false],
    isScale: [false, false],
  },
  resource: {
    title: `Not yet implemented`,
    valueLabels: ["Type", "Variation"],
    valueDefaults: ["?", "?"],
    multi: [false, false],
    isScale: [false, false],
  },
  signup: {
    title: `Email Sign Up Widget`,
    valueLabels: ["Contact Persona", "Prompt Text", "Clarify Consent"],
    valueDefaults: ["Major Updates Only", "Keep in touch!", "false"],
    multi: [false, false, false],
    isScale: [false, false, false],
  },
};
