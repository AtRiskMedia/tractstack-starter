import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  toolAddModeStore,
  viewportStore,
  showAnalytics,
} from "@/store/storykeep";
import { activeHelpKeyStore } from "@/store/help";
import { type NodesContext } from "@/store/nodes";
import { PaneAddMode, StoryFragmentMode, ContextPaneMode, PaneConfigMode } from "@/types";
import type { SettingsPanelSignal } from "@/types";

const settingsActionToHelpKey: Record<string, string> = {
  "style-element": "PANEL_STYLE_ELEMENT",
  "style-link": "PANEL_STYLE_LINK",
  "style-link-config": "PANEL_STYLE_LINK_CONFIG",
  "style-link-add": "PANEL_ADD_STYLE",
  "style-link-add-hover": "PANEL_ADD_STYLE",
  "style-link-update": "PANEL_UPDATE_STYLE",
  "style-link-update-hover": "PANEL_UPDATE_STYLE",
  "style-link-remove": "PANEL_REMOVE_STYLE",
  "style-link-remove-hover": "PANEL_REMOVE_STYLE",
  "style-image": "PANEL_STYLE_IMAGE",
  "style-img-add": "PANEL_ADD_STYLE",
  "style-img-container-add": "PANEL_ADD_STYLE",
  "style-img-outer-add": "PANEL_ADD_STYLE",
  "style-img-update": "PANEL_UPDATE_STYLE",
  "style-img-container-update": "PANEL_UPDATE_STYLE",
  "style-img-outer-update": "PANEL_UPDATE_STYLE",
  "style-img-remove": "PANEL_REMOVE_STYLE",
  "style-img-container-remove": "PANEL_REMOVE_STYLE",
  "style-img-outer-remove": "PANEL_REMOVE_STYLE",
  "style-widget": "PANEL_STYLE_WIDGET",
  "style-code-config": "PANEL_STYLE_WIDGET_CONFIG",
  "style-code-add": "PANEL_ADD_STYLE",
  "style-code-container-add": "PANEL_ADD_STYLE",
  "style-code-outer-add": "PANEL_ADD_STYLE",
  "style-code-update": "PANEL_UPDATE_STYLE",
  "style-code-container-update": "PANEL_UPDATE_STYLE",
  "style-code-outer-update": "PANEL_UPDATE_STYLE",
  "style-code-remove": "PANEL_REMOVE_STYLE",
  "style-code-container-remove": "PANEL_REMOVE_STYLE",
  "style-code-outer-remove": "PANEL_REMOVE_STYLE",
  "style-parent": "PANEL_STYLE_PARENT",
  "style-parent-add": "PANEL_ADD_STYLE",
  "style-parent-remove": "PANEL_REMOVE_STYLE",
  "style-parent-update": "PANEL_UPDATE_STYLE",
  "style-parent-delete-layer": "PANEL_DELETE_LAYER",
  "style-break": "PANEL_STYLE_BREAK",
  "style-li-element": "PANEL_STYLE_LI",
  "style-li-element-add": "PANEL_ADD_STYLE",
  "style-li-container-add": "PANEL_ADD_STYLE",
  "style-li-element-update": "PANEL_UPDATE_STYLE",
  "style-li-container-update": "PANEL_UPDATE_STYLE",
  "style-li-element-remove": "PANEL_REMOVE_STYLE",
  "style-li-container-remove": "PANEL_REMOVE_STYLE",
  "setup-codehook": "PANEL_STYLE_CODEHOOK",
  debug: "MODE_DEBUG",
};

const toolModeToHelpKey: Record<string, string> = {
  styles: "MODE_STYLES",
  text: "MODE_TEXT",
  insert: "MODE_INSERT",
  eraser: "MODE_ERASER",
  move: "MODE_MOVE",
  layout: "MODE_LAYOUT",
  debug: "MODE_DEBUG",
};

const toolAddModeToHelpKey: Record<string, string> = {
  p: "INSERT_P",
  h2: "INSERT_H2",
  h3: "INSERT_H3",
  h4: "INSERT_H4",
  img: "INSERT_IMG",
  signup: "INSERT_SIGNUP",
  yt: "INSERT_YT",
  bunny: "INSERT_BUNNY",
  belief: "INSERT_BELIEF",
  identify: "INSERT_IDENTIFY",
  toggle: "INSERT_TOGGLE",
};

const paneAddModeToHelpKey: Record<string, string> = {
  [PaneAddMode.DEFAULT]: "ACTION_ADD_PANE",
  [PaneAddMode.NEW]: "ACTION_ADD_PANE_NEW",
  [PaneAddMode.BREAK]: "ACTION_ADD_PANE_BREAK",
  [PaneAddMode.REUSE]: "ACTION_ADD_PANE_REUSE",
  [PaneAddMode.CODEHOOK]: "ACTION_ADD_PANE_CODEHOOK",
};

const storyFragmentModeToHelpKey: Record<string, string> = {
  [StoryFragmentMode.DEFAULT]: "PANEL_CONFIG_PAGE",
  [StoryFragmentMode.SLUG]: "PANEL_CONFIG_PAGE_SLUG",
  [StoryFragmentMode.MENU]: "PANEL_CONFIG_PAGE_MENU",
  [StoryFragmentMode.OG]: "PANEL_CONFIG_PAGE_OG",
};

const paneConfigModeToHelpKey: Record<string, string> = {
  [PaneConfigMode.DEFAULT]: "PANEL_CONFIG_PANE",
  [PaneConfigMode.TITLE]: "PANEL_CONFIG_PANE_TITLE",
  [PaneConfigMode.SLUG]: "PANEL_CONFIG_PANE_SLUG",
  [PaneConfigMode.PATH]: "PANEL_CONFIG_PANE_PATH",
  [PaneConfigMode.IMPRESSION]: "PANEL_CONFIG_PANE_IMPRESSION",
  [PaneConfigMode.CODEHOOK]: "PANEL_STYLE_CODEHOOK",
};

const contextPaneModeToHelpKey: Record<string, string> = {
  [ContextPaneMode.DEFAULT]: "PANEL_CONFIG_PANE",
  [ContextPaneMode.TITLE]: "PANEL_CONFIG_PANE_TITLE",
  [ContextPaneMode.SLUG]: "PANEL_CONFIG_PANE_SLUG",
};

const viewportToHelpKey: Record<string, string> = {
  auto: "VIEWPORT_AUTO",
  mobile: "VIEWPORT_MOBILE",
  tablet: "VIEWPORT_TABLET",
  desktop: "VIEWPORT_DESKTOP",
};

export const useContextualHelp = (signal: SettingsPanelSignal | null, ctx: NodesContext) => {
  const toolMode = useStore(ctx.toolModeValStore);
  const toolAddMode = useStore(toolAddModeStore);
  const paneAddMode = useStore(ctx.paneAddMode);
  const activePaneMode = useStore(ctx.activePaneMode);
  const storyFragmentMode = useStore(ctx.storyFragmentModeStore);
  const contextPaneMode = useStore(ctx.contextPaneMode);
  const viewport = useStore(viewportStore);
  const $showAnalytics = useStore(showAnalytics);

  useEffect(() => {
    let helpKey: string | null = null;

    if (signal?.action && settingsActionToHelpKey[signal.action]) {
      helpKey = settingsActionToHelpKey[signal.action];
    } else if (
      activePaneMode?.mode &&
      activePaneMode.panel === "settings" &&
      paneConfigModeToHelpKey[activePaneMode.mode]
    ) {
      helpKey = paneConfigModeToHelpKey[activePaneMode.mode];
    } else if (
      activePaneMode?.paneId &&
      paneAddMode[activePaneMode.paneId] &&
      paneAddMode[activePaneMode.paneId] !== PaneAddMode.DEFAULT &&
      paneAddModeToHelpKey[paneAddMode[activePaneMode.paneId]]
    ) {
      helpKey = paneAddModeToHelpKey[paneAddMode[activePaneMode.paneId]];
    } else if (
      activePaneMode?.paneId &&
      storyFragmentMode[activePaneMode.paneId] &&
      storyFragmentMode[activePaneMode.paneId] !== StoryFragmentMode.DEFAULT &&
      storyFragmentModeToHelpKey[storyFragmentMode[activePaneMode.paneId]]
    ) {
      helpKey = storyFragmentModeToHelpKey[storyFragmentMode[activePaneMode.paneId]];
    } else if (
      activePaneMode?.paneId &&
      contextPaneMode[activePaneMode.paneId] &&
      contextPaneMode[activePaneMode.paneId] !== ContextPaneMode.DEFAULT &&
      contextPaneModeToHelpKey[contextPaneMode[activePaneMode.paneId]]
    ) {
      helpKey = contextPaneModeToHelpKey[contextPaneMode[activePaneMode.paneId]];
    } else if (toolMode.value === "insert" && toolAddModeToHelpKey[toolAddMode.value]) {
      helpKey = toolAddModeToHelpKey[toolAddMode.value];
    } else if ($showAnalytics) {
      helpKey = "VIEW_ANALYTICS";
    } else if (viewport.value && viewportToHelpKey[viewport.value]) {
      helpKey = viewportToHelpKey[viewport.value];
    } else if (toolMode.value && toolModeToHelpKey[toolMode.value]) {
      helpKey = toolModeToHelpKey[toolMode.value];
    } else {
      helpKey = "DEFAULT";
    }

    if (activeHelpKeyStore.get() !== helpKey) {
      activeHelpKeyStore.set(helpKey);
    }
  }, [
    signal,
    toolMode.value,
    toolAddMode.value,
    paneAddMode,
    activePaneMode,
    storyFragmentMode,
    contextPaneMode,
    viewport.value,
    $showAnalytics,
  ]);
};
