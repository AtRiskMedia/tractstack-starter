import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { activeHelpKeyStore } from "@/store/help";
import { type NodesContext } from "@/store/nodes";
import { PaneAddMode, StoryFragmentMode, ContextPaneMode, PaneConfigMode } from "@/types";
import type { SettingsPanelSignal, PanelState } from "@/types";

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

const paneAddModeToHelpKey: Record<string, string> = {
  [PaneAddMode.DEFAULT]: "ACTION_ADD_PANE",
  [PaneAddMode.NEW]: "ACTION_ADD_PANE_NEW",
  [PaneAddMode.BREAK]: "ACTION_ADD_PANE_BREAK",
  [PaneAddMode.REUSE]: "ACTION_ADD_PANE_REUSE",
  [PaneAddMode.CODEHOOK]: "ACTION_ADD_PANE_CODEHOOK",
};

const StylesMemoryToHelpKey: Record<string, string> = {
  [`copy`]: "STYLES_COPY",
  [`paste`]: "STYLES_PASTE",
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

export const useContextualHelp = (signal: SettingsPanelSignal | null, ctx: NodesContext) => {
  const toolMode = useStore(ctx.toolModeValStore);
  const activePaneMode = useStore(ctx.activePaneMode) as PanelState;
  const hasTitle = useStore(ctx.hasTitle);
  const hasPanes = useStore(ctx.hasPanes);

  useEffect(() => {
    let helpKey: string | null = null;

    // Give priority to !hasPanes or !hasTitle
    if (!hasTitle) helpKey = "MISSING_TITLE";
    else if (!hasPanes) helpKey = "MISSING_PANES";
    // Give priority to styles-memory panel
    else if (activePaneMode.panel === "styles-memory" && activePaneMode.mode) {
      helpKey = StylesMemoryToHelpKey[activePaneMode.mode] || "STYLES_COPY";
    }
    // Then check signal
    else if (signal?.action && !signal.minimized && settingsActionToHelpKey[signal.action]) {
      helpKey = settingsActionToHelpKey[signal.action];
    }
    // Then handle other panel types
    else if (activePaneMode.panel && activePaneMode.mode) {
      switch (activePaneMode.panel) {
        case "insert":
          helpKey = "GHOST_INSERT";
          break;
        case "settings":
          helpKey = paneConfigModeToHelpKey[activePaneMode.mode] || "";
          break;
        case "add":
          helpKey = paneAddModeToHelpKey[activePaneMode.mode] || "";
          break;
        case "storyfragment":
          helpKey = storyFragmentModeToHelpKey[activePaneMode.mode] || "";
          break;
        case "context":
          helpKey = contextPaneModeToHelpKey[activePaneMode.mode] || "";
          break;
      }
    }
    // Fallback to tool modes
    else if (toolMode?.value === "insert") {
      helpKey = "MODE_INSERT";
    } else if (toolMode?.value && toolModeToHelpKey[toolMode.value]) {
      helpKey = toolModeToHelpKey[toolMode.value];
    } else {
      helpKey = "DEFAULT";
    }

    if (activeHelpKeyStore.get() !== helpKey) {
      activeHelpKeyStore.set(helpKey);
    }
  }, [signal, toolMode?.value, activePaneMode, hasTitle, hasPanes]);
};
