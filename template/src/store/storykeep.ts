import { persistentAtom } from "@nanostores/persistent";
import { map, atom } from "nanostores";
import type { ControlPosition } from "react-draggable";
import type { Root } from "hast";
import type {
  MarkdownLookup,
  ToolModeVal,
  ToolAddMode,
  Analytics,
  DashboardAnalytics,
  SettingsPanelSignal,
  Theme,
  Tag,
  StoryfragmentAnalytics,
  ArtpacksStore,
} from "@/types";
import { toolAddModes } from "@/constants";
import { createNodeIdFromDragNode } from "@/utils/common/helpers.ts";

export const brandColours = atom<string>("10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3");
export const preferredTheme = atom<Theme>("light");
export const homeSlugStore = atom<string>("");
export const tractstackSlugStore = atom<string>("");
export const hasAssemblyAIStore = atom<boolean>(false);
export const isDemoModeStore = atom<boolean>(false);
export const keyboardAccessible = atom<boolean>(false);
export const showAnalytics = atom<boolean>(false);
export const storedAnalytics = map<Analytics>();
export const storedDashboardAnalytics = map<DashboardAnalytics>();
export const analyticsDuration = atom<`daily` | `weekly` | `monthly`>(`weekly`);
export const hasArtpacksStore = map<ArtpacksStore>({});
export const tenantIdStore = atom<string>(`default`);

export const activeHelpTemplateStore = atom<string | null>(`example`);

export const viewportKeyStore = map<{
  value: "mobile" | "tablet" | "desktop";
}>({
  value: "mobile",
});
export const viewportStore = map<{
  value: "auto" | "mobile" | "tablet" | "desktop";
}>({
  value: "auto",
});
export const viewportSetStore = atom<boolean>(false);

export const toolModeStore = map<{ value: ToolModeVal }>({
  value: "text",
});
export const toolAddModeStore = map<{ value: ToolAddMode }>({
  value: toolAddModes[0],
});

export const settingsPanelStore = atom<SettingsPanelSignal | null>(null);

// ==========================
// Drag n Drop
// ==========================

export const lastDragTime = atom<number>(-1);
export const dragStartTime = atom<number>(-1);

export const updateDragStartTime = () => {
  console.log("update drag start time");
  dragStartTime.set(new Date().getTime());
};

export enum Location {
  NOWHERE = -1,
  BEFORE = 0,
  AFTER = 1,
}

export interface DragNode {
  fragmentId: string;
  paneId: string;
  idx: number | null;
  outerIdx: number;
}

export interface DragState extends DragNode {
  location: "before" | "after" | "none";
  markdownLookup: MarkdownLookup;
}

export interface DragShape extends DragNode {
  root: Root;
  markdownLookup: MarkdownLookup;
}

export type DragHandle = {
  pos: ControlPosition;
  ghostHeight: number;
  hoverElement: DragState | null;
  affectedFragments: Set<string>;
  affectedPanes: Set<string>;
  dropState: DragState | null;
  dragShape: DragShape | null;
};

const EMPTY_DRAG_HANDLE: DragHandle = {
  pos: { x: 0, y: 0 },
  ghostHeight: 0,
  hoverElement: null,
  dropState: null,
  affectedFragments: new Set<string>(),
  affectedPanes: new Set<string>(),
  dragShape: null,
};

export const resetDragStore = () => {
  //console.log("reset drag store");
  dragHoverStatesBuffer.length = 0;
  dragHandleStore.set(EMPTY_DRAG_HANDLE);
};

export const setDragShape = (shape: DragShape | null) => {
  dragHandleStore.set({
    ...dragHandleStore.get(),
    dragShape: shape,
  });
  //console.log("drag shape: " + JSON.stringify(shape));
};

export const dropDraggingElement = () => {
  console.log("drop shape.");

  const existingEl = dragHandleStore.get()?.hoverElement || null;
  dragHandleStore.set({
    ...dragHandleStore.get(),
    hoverElement: null,
    dropState: existingEl,
  });
};

export const recordExitPane = (paneId: string) => {
  if (!dragHandleStore.get().affectedPanes.has(paneId)) return;

  console.log("exit pane.");

  const panes = new Set<string>(dragHandleStore.get().affectedPanes);
  panes.delete(paneId);
  if (panes.size === 0) {
    console.log("no panes recorded, clear all affected fragments");
    resetDragStore();
  } else {
    dragHandleStore.set({ ...dragHandleStore.get(), affectedPanes: panes });
  }
};

const dragHoverStatesBuffer: string[] = [];

export const setDragHoverInfo = (el: DragState | null) => {
  const existingEl = dragHandleStore.get().hoverElement;
  if (existingEl) {
    if (
      existingEl.paneId === el?.paneId &&
      existingEl.fragmentId === el?.fragmentId &&
      existingEl.location === el.location &&
      existingEl.idx === el.idx &&
      existingEl.outerIdx === el.outerIdx
    )
      return;
  }

  const nodes = new Set<string>(dragHandleStore.get().affectedFragments);
  if (el) {
    const elId = createNodeIdFromDragNode(el);
    const elIdWithDir = elId + "-" + el.location;
    dragHoverStatesBuffer.push(elIdWithDir);

    if (dragHoverStatesBuffer.length >= 3 && dragHoverStatesBuffer.shift() === elIdWithDir) {
      console.log("already contains: " + elIdWithDir);
      return;
    }
    // trim buffer so it's never over size
    while (dragHoverStatesBuffer.length > 3) {
      dragHoverStatesBuffer.shift();
    }
    nodes.add(elId);
  }
  const panes = new Set<string>(dragHandleStore.get().affectedPanes);
  if (el) {
    panes.add(el.paneId);
  }
  dragHandleStore.set({
    ...dragHandleStore.get(),
    hoverElement: el,
    affectedPanes: panes,
    affectedFragments: nodes,
  });
};

export const setDragPosition = (pos: ControlPosition) => {
  updateDragStartTime();
  dragHandleStore.set({
    ...dragHandleStore.get(),
    pos,
  });
  //console.log("drag pos: " + JSON.stringify(pos));
};

export const setGhostBlockHeight = (h: number) => {
  dragHandleStore.set({
    ...dragHandleStore.get(),
    ghostHeight: h,
  });
};

export const dragHandleStore = atom<DragHandle>(EMPTY_DRAG_HANDLE);

type ElementStylesMemory = {
  [key in Tag]?: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  };
};
type ParentStylesMemory = {
  parentClasses: Array<{
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  }>;
  bgColour: string | null;
};
type ButtonStylesMemory = {
  buttonClasses: Record<string, string[]>;
  buttonHoverClasses: Record<string, string[]>;
};

export const elementStylesMemoryStore = persistentAtom<ElementStylesMemory>(
  "element-styles-memory:",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const parentStylesMemoryStore = persistentAtom<ParentStylesMemory>(
  "parent-styles-memory:",
  {
    parentClasses: [],
    bgColour: null,
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const buttonStylesMemoryStore = persistentAtom<ButtonStylesMemory>(
  "button-styles-memory:",
  {
    buttonClasses: {},
    buttonHoverClasses: {},
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

export const storyFragmentTopicsStore = map<{
  [storyFragmentId: string]: {
    description: string;
    topics: { id?: string; title: string }[];
  };
}>({});

export const storyfragmentAnalyticsStore = map<{
  byId: Record<string, StoryfragmentAnalytics>;
  lastUpdated: number | null;
}>({
  byId: {},
  lastUpdated: null,
});

export const styleElementInfoStore = map<{
  markdownParentId: string | null;
  tagName: string | null;
  overrideNodeId: string | null;
  className: string | null;
}>({
  markdownParentId: null,
  tagName: null,
  overrideNodeId: null,
  className: null,
});

export const resetStyleElementInfo = () => {
  styleElementInfoStore.set({
    markdownParentId: null,
    tagName: null,
    overrideNodeId: null,
    className: null,
  });
};
