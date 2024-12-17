import { map, atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import settingsMap from "../../config/settingsMap.json";
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
  EnvSettingType,
  Analytics,
  DashboardAnalytics,
  CreationState,
  Theme,
  DesignType,
} from "../types";
import { PUBLIC_THEME, toolAddModes } from "../constants";
import type { ControlPosition } from "react-draggable";
import type { Root } from "hast";
import { createNodeIdFromDragNode } from "@/utils/common/helpers.ts";

export const themeStore = persistentAtom<Theme>("theme-store", PUBLIC_THEME as Theme);

export const lastInteractedPaneStore = atom<string | null>(null);
export const visiblePanesStore = map<Record<string, boolean>>({});
export const lastInteractedTypeStore = atom<"markdown" | "bgpane" | null>(null);

export const knownEnvSettings: EnvSetting[] = Object.entries(settingsMap.settings).map(
  ([name, setting]) => ({
    name,
    ...setting,
    type: setting.type as EnvSettingType, // Assert the type matches EnvSettingType
  })
);

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
  markdownLookup?: MarkdownLookup;
}

export interface ElementDragState {
  location: "before" | "after" | "none";
  node?: DragNode;
  pane?: DragPane;
}

export interface DragShape extends DragNode {
  root: Root;
}

export interface DragPane {
  paneId: string;
}

export type DragHandle = {
  pos: ControlPosition;
  ghostHeight: number;
  hoverElement: ElementDragState | null;
  affectedFragments: Set<string>;
  affectedPanes: Set<string>;
  dropState: ElementDragState | null;
  dragShape: DragShape | null;
  dragPane: DragPane | null;
};

const EMPTY_DRAG_HANDLE: DragHandle = {
  pos: { x: 0, y: 0 },
  ghostHeight: 0,
  hoverElement: null,
  dropState: null,
  affectedFragments: new Set<string>(),
  affectedPanes: new Set<string>(),
  dragShape: null,
  dragPane: null,
};

export const resetDragStore = () => {
  console.log("reset drag store");
  dragHoverStatesBuffer.length = 0;
  dragHandleStore.set(EMPTY_DRAG_HANDLE);
}

export const setDragPane = (pane: DragPane|null) => {
  dragHandleStore.set({
    ...dragHandleStore.get(),
    dragPane: pane
  });
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

export const setDragHoverInfo = (el: ElementDragState | null) => {
  const existingEl = dragHandleStore.get().hoverElement;
  if (existingEl && existingEl.node) {
    const dragEl = existingEl.node;
    if (
      dragEl.paneId === el?.node?.paneId &&
      dragEl.fragmentId === el?.node?.fragmentId &&
      existingEl.location === el.location &&
      dragEl.idx === el?.node?.idx &&
      dragEl.outerIdx === el?.node?.outerIdx
    )
      return;
  }

  const nodes = new Set<string>(dragHandleStore.get().affectedFragments);
  if (el) {
    if(el.node) {
    const elId = createNodeIdFromDragNode(el.node);
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
  }
  const panes = new Set<string>(dragHandleStore.get().affectedPanes);
  if (el && el.pane) {
    panes.add(el.pane.paneId);
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
export const paneDesignType = map<Record<string, FieldWithHistory<DesignType>>>();
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
