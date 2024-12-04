import { map, atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import type {
  BeliefDatum,
  BgPaneDatum,
  BgColourDatum,
  MarkdownEditDatum,
  FieldWithHistory,
  FileDatum,
  MenuDatum,
  ResourceDatum,
  StoryKeepFileDatum,
  TractStackDatum,
  CodeHookDatum,
  ImpressionDatum,
  IsInit,
  MarkdownLookup,
  StoreKey,
  ToolMode,
  ToolAddMode,
  EditModeValue,
  StylesMemory,
  EnvSetting,
  Analytics,
  DashboardAnalytics,
  CreationState,
  Theme,
  DesignType,
} from "../types";
import { knownEnvSettings, PUBLIC_THEME, toolAddModes } from "../constants";
import type { ControlPosition } from "react-draggable";
import type { Root } from "hast";
import { createNodeId } from "@/utils/helpers.ts";

export const themeStore = persistentAtom<Theme>("theme-store", PUBLIC_THEME as Theme);

export const lastInteractedPaneStore = atom<string | null>(null);
export const visiblePanesStore = map<Record<string, boolean>>({});
export const lastInteractedTypeStore = atom<"markdown" | "bgpane" | null>(null);

export const envSettings = map<{
  current: EnvSetting[];
  original: EnvSetting[];
  history: { value: EnvSetting[]; timestamp: number }[];
}>({
  current: knownEnvSettings,
  original: knownEnvSettings,
  history: [],
});

export const creationStateStore = atom<CreationState>({
  id: null,
  isInitialized: false,
});

// Track if we're in preview mode - store as string 'true'/'false'
export const previewMode = persistentAtom<string>("preview-mode", "false");
// Track if preview database is initialized - store as string 'true'/'false'
export const previewDbInitialized = persistentAtom<string>("preview-db-initialized", "false");
// Helper function to get boolean value
export function getPreviewModeValue(value: string): boolean {
  return value === "true";
}
// Reset preview state
export function resetPreviewState() {
  previewMode.set("false");
  previewDbInitialized.set("false");
}

// all look-ups by ulid
//

export const showAnalytics = atom<boolean>(false);
export const storedAnalytics = map<Analytics>();
export const storedDashboardAnalytics = map<DashboardAnalytics>();
export const analyticsDuration = atom<`daily` | `weekly` | `monthly`>(`weekly`);

// storykeep state
export const unsavedChangesStore = map<Record<string, Record<StoreKey, boolean>>>({});
export const uncleanDataStore = map<Record<string, Record<StoreKey, boolean>>>({});
export const temporaryErrorsStore = map<Record<string, Record<StoreKey, boolean>>>({});
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
export const toolModeStore = map<{ value: ToolMode }>({
  value: "text",
});
export const toolAddModeStore = map<{ value: ToolAddMode }>({
  value: toolAddModes[0], // Default to the first mode
});

export const editModeStore = atom<EditModeValue | null>(null);

// ==========================
// Drag n Drop
// ==========================

export const lastDragTime = atom<number>(-1);
export const dragStartTime = atom<number>(-1);

export const updateDragStartTime = () => {
  console.log("update drag start time");
  dragStartTime.set(new Date().getTime());
}

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
  ghostWidth: number;
  hoverElement: DragState | null;
  affectedFragments: Set<string>;
  affectedPanes: Set<string>;
  dropState: DragState | null;
  dragShape: DragShape | null;
};

const EMPTY_DRAG_HANDLE: DragHandle = {
  pos: { x: 0, y: 0 },
  ghostHeight: 0,
  ghostWidth: 0,
  hoverElement: null,
  dropState: null,
  affectedFragments: new Set<string>(),
  affectedPanes: new Set<string>(),
  dragShape: null,
};

export const resetDragStore = () => {
  console.log("reset drag store");
  dragHoverStatesBuffer.length = 0;
  dragHandleStore.set(EMPTY_DRAG_HANDLE);
}

export const setDragShape = (shape: DragShape|null) => {
  dragHandleStore.set({
    ...dragHandleStore.get(),
    dragShape: shape
  });
  //console.log("drag shape: " + JSON.stringify(shape));
}

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
    const elId = createNodeId(el);
    const elIdWithDir = elId + "-" + el.location;
    dragHoverStatesBuffer.push(elIdWithDir);

    if(dragHoverStatesBuffer.length >= 3 && dragHoverStatesBuffer.shift() === elIdWithDir) {
      console.log("already contains: " + elIdWithDir);
      return;
    }
    // trim buffer so it's never over size
    while (dragHoverStatesBuffer.length > 3) {dragHoverStatesBuffer.shift();}
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

export const setGhostSize = (w: number, h: number) => {
  dragHandleStore.set({
    ...dragHandleStore.get(),
    ghostWidth: w,
    ghostHeight: h,
  });
};

export const dragHandleStore = atom<DragHandle>(EMPTY_DRAG_HANDLE);

// styles memory
export const stylesMemoryStore = map<StylesMemory>({});

// datums from turso
export const menu = map<Record<string, FieldWithHistory<MenuDatum>>>();
export const file = map<Record<string, FieldWithHistory<StoryKeepFileDatum>>>();
export const resource = map<Record<string, FieldWithHistory<ResourceDatum>>>();
export const tractstack = map<Record<string, FieldWithHistory<TractStackDatum>>>();

export const storyFragmentInit = map<IsInit>();
export const paneInit = map<IsInit>();
export const storyFragmentUnsavedChanges = map<IsInit>();
export const paneUnsavedChanges = map<IsInit>();

export const storyFragmentTitle = map<Record<string, FieldWithHistory<string>>>();
export const storyFragmentSlug = map<Record<string, FieldWithHistory<string>>>();
export const storyFragmentTractStackId = map<Record<string, FieldWithHistory<string>>>();
export const storyFragmentMenuId = map<Record<string, FieldWithHistory<string>>>();
export const storyFragmentPaneIds = map<Record<string, FieldWithHistory<string[]>>>();
export const storyFragmentSocialImagePath = map<Record<string, FieldWithHistory<string>>>();
export const storyFragmentTailwindBgColour = map<Record<string, FieldWithHistory<string>>>();

export const paneTitle = map<Record<string, FieldWithHistory<string>>>();
export const paneSlug = map<Record<string, FieldWithHistory<string>>>();
export const paneMarkdownFragmentId = map<Record<string, FieldWithHistory<string>>>();
export const paneIsContextPane = map<Record<string, FieldWithHistory<boolean>>>();
export const paneDesignType = map<Record<string, DesignType>>();
export const paneIsHiddenPane = map<Record<string, FieldWithHistory<boolean>>>();
export const paneHasOverflowHidden = map<Record<string, FieldWithHistory<boolean>>>();
export const paneHasMaxHScreen = map<Record<string, FieldWithHistory<boolean>>>();
export const paneHeightOffsetDesktop = map<Record<string, FieldWithHistory<number>>>();
export const paneHeightOffsetTablet = map<Record<string, FieldWithHistory<number>>>();
export const paneHeightOffsetMobile = map<Record<string, FieldWithHistory<number>>>();
export const paneHeightRatioDesktop = map<Record<string, FieldWithHistory<string>>>();
export const paneHeightRatioTablet = map<Record<string, FieldWithHistory<string>>>();
export const paneHeightRatioMobile = map<Record<string, FieldWithHistory<string>>>();
export const paneFiles = map<Record<string, FieldWithHistory<FileDatum[]>>>();
export const paneCodeHook = map<Record<string, FieldWithHistory<CodeHookDatum | null>>>();
export const paneImpression = map<Record<string, FieldWithHistory<ImpressionDatum | null>>>();
export const paneHeldBeliefs = map<Record<string, FieldWithHistory<BeliefDatum>>>();
export const paneWithheldBeliefs = map<Record<string, FieldWithHistory<BeliefDatum>>>();

// pane fragments have no ids ...
// PaneDatum has an array of BgPaneDatum, BgColourDatum, MarkdownPaneDatum
// the nanostore state is derived from PaneDatum;
// paneFragment ids are generated during this process and linked accordingly
// on save, paneFragmentsPayload as json object is generated
export const paneFragmentIds = map<Record<string, FieldWithHistory<string[]>>>();
export const paneFragmentBgPane = map<Record<string, FieldWithHistory<BgPaneDatum>>>();
export const paneFragmentBgColour = map<Record<string, FieldWithHistory<BgColourDatum>>>();
export const paneFragmentMarkdown = map<Record<string, FieldWithHistory<MarkdownEditDatum>>>();
