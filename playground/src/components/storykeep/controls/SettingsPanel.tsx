import { useState } from "react";
import { useStore } from "@nanostores/react";
import ChevronDoubleUpIcon from "@heroicons/react/24/outline/ChevronDoubleUpIcon";
import ChevronDoubleDownIcon from "@heroicons/react/24/outline/ChevronDoubleDownIcon";
import {
  resetStyleElementInfo,
  settingsPanelStore,
  styleElementInfoStore,
} from "@/store/storykeep";
import StyleCodeHookPanel from "./panels/StyleCodeHookPanel";
import StyleBreakPanel from "./panels/StyleBreakPanel";
import StyleLinkPanel from "./panels/StyleLinkPanel";
import StyleLinkAddPanel from "./panels/StyleLinkPanel_add";
import StyleLinkUpdatePanel from "./panels/StyleLinkPanel_update";
import StyleLinkRemovePanel from "./panels/StyleLinkPanel_remove";
import StyleLinkConfigPanel from "./panels/StyleLinkPanel_config";
import StyleElementPanel from "./panels/StyleElementPanel";
import StyleElementAddPanel from "./panels/StyleElementPanel_add";
import StyleElementRemovePanel from "./panels/StyleElementPanel_remove";
import StyleElementUpdatePanel from "./panels/StyleElementPanel_update";
import StyleLiElementPanel from "./panels/StyleLiElementPanel";
import StyleLiElementAddPanel from "./panels/StyleLiElementPanel_add";
import StyleLiElementUpdatePanel from "./panels/StyleLiElementPanel_update";
import StyleLiElementRemovePanel from "./panels/StyleLiElementPanel_remove";
import StyleImagePanel from "./panels/StyleImagePanel";
import StyleImageAddPanel from "./panels/StyleImagePanel_add";
import StyleImageUpdatePanel from "./panels/StyleImagePanel_update";
import StyleImageRemovePanel from "./panels/StyleImagePanel_remove";
import StyleWidgetPanel from "./panels/StyleWidgetPanel";
import StyleWidgetConfigPanel from "./panels/StyleWidgetPanel_config";
import StyleWidgetAddPanel from "./panels/StyleWidgetPanel_add";
import StyleWidgetUpdatePanel from "./panels/StyleWidgetPanel_update";
import StyleWidgetRemovePanel from "./panels/StyleWidgetPanel_remove";
import StyleParentPanel from "./panels/StyleParentPanel";
import StyleParentRemovePanel from "./panels/StyleParentPanel_remove";
import StyleParentAddPanel from "./panels/StyleParentPanel_add";
import StyleParentDeleteLayerPanel from "./panels/StyleParentPanel_deleteLayer";
import StyleParentUpdatePanel from "./panels/StyleParentPanel_update";
import { getCtx } from "@/store/nodes";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { type ReactElement } from "react";
import type { MarkdownPaneFragmentNode, FlatNode, Config } from "@/types";

export interface BasePanelProps {
  node: FlatNode | null;
  config?: Config | null;
  parentNode?: FlatNode;
  containerNode?: FlatNode;
  outerContainerNode?: FlatNode;
  layer?: number;
  className?: string;
  childId?: string;
  availableCodeHooks?: string[];
}

const getPanel = (
  config: Config | null,
  action: string,
  clickedNode: FlatNode | null,
  availableCodeHooks: string[],
  paneNode?: FlatNode,
  childNodes: FlatNode[] = [],
  layer?: number,
  className?: string,
  childId?: string
): ReactElement | null => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownNode = childNodes.find((node) => node.nodeType === "Markdown");

  if (markdownNode && !isMarkdownPaneFragmentNode(markdownNode)) return null;

  switch (action) {
    case "style-break":
      return clickedNode ? (
        <StyleBreakPanel config={config} node={clickedNode} parentNode={paneNode} />
      ) : null;
    case "style-parent":
      return markdownNode ? (
        <StyleParentPanel node={markdownNode} parentNode={paneNode} layer={layer} config={config} />
      ) : null;
    case "style-parent-add":
      return markdownNode ? (
        <StyleParentAddPanel node={markdownNode} layer={layer} className={className} />
      ) : null;
    case "style-parent-remove":
      return markdownNode ? (
        <StyleParentRemovePanel node={markdownNode} layer={layer} className={className} />
      ) : null;
    case "style-parent-update":
      return markdownNode ? (
        <StyleParentUpdatePanel
          node={markdownNode}
          layer={layer}
          className={className}
          config={config}
        />
      ) : null;
    case "style-parent-delete-layer":
      return markdownNode ? (
        <StyleParentDeleteLayerPanel node={markdownNode} layer={layer} />
      ) : null;
    case "style-link":
      return clickedNode && markdownNode ? <StyleLinkPanel node={clickedNode} /> : null;
    case "style-link-add":
    case "style-link-add-hover":
      return clickedNode && markdownNode ? <StyleLinkAddPanel node={clickedNode} /> : null;
    case "style-link-update":
    case "style-link-update-hover":
      return clickedNode ? (
        <StyleLinkUpdatePanel node={clickedNode} className={className} config={config} />
      ) : null;
    case "style-link-remove":
    case "style-link-remove-hover":
      return clickedNode ? <StyleLinkRemovePanel node={clickedNode} className={className} /> : null;
    case "style-link-config":
      return clickedNode && config ? (
        <StyleLinkConfigPanel node={clickedNode} config={config} />
      ) : null;
    case "style-element":
      return clickedNode && markdownNode ? (
        <StyleElementPanel
          node={clickedNode}
          parentNode={markdownNode as MarkdownPaneFragmentNode}
        />
      ) : null;
    case "style-element-add":
      return clickedNode && markdownNode ? (
        <StyleElementAddPanel node={clickedNode} parentNode={markdownNode} className={className} />
      ) : null;
    case "style-element-remove":
      return clickedNode && markdownNode ? (
        <StyleElementRemovePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
        />
      ) : null;
    case "style-element-update":
      return clickedNode && markdownNode && className && config ? (
        <StyleElementUpdatePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          config={config}
        />
      ) : null;
    case "style-image": {
      if (!clickedNode?.parentId) return null;
      const containerNode = allNodes.get(clickedNode.parentId);
      if (!containerNode?.parentId) return null;
      const outerContainerNode = allNodes.get(containerNode.parentId);

      if (markdownNode && containerNode && outerContainerNode) {
        return (
          <StyleImagePanel
            node={clickedNode}
            parentNode={markdownNode}
            containerNode={containerNode as FlatNode}
            outerContainerNode={outerContainerNode as FlatNode}
          />
        );
      }
      return null;
    }
    case "style-img-add":
    case "style-img-container-add":
    case "style-img-outer-add":
      return <StyleImageAddPanel node={clickedNode} parentNode={markdownNode} childId={childId} />;
    case "style-img-update":
    case "style-img-container-update":
    case "style-img-outer-update":
      return clickedNode && markdownNode && className && config ? (
        <StyleImageUpdatePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
          config={config}
        />
      ) : null;
    case "style-img-remove":
    case "style-img-container-remove":
    case "style-img-outer-remove":
      return clickedNode && markdownNode && className ? (
        <StyleImageRemovePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
        />
      ) : null;
    case "style-widget": {
      if (!clickedNode?.parentId) return null;
      const containerNode = allNodes.get(clickedNode.parentId);
      if (!containerNode?.parentId) return null;
      const outerContainerNode = allNodes.get(containerNode.parentId);

      if (markdownNode && containerNode && outerContainerNode) {
        return (
          <StyleWidgetPanel
            node={clickedNode}
            parentNode={markdownNode}
            containerNode={containerNode as FlatNode}
            outerContainerNode={outerContainerNode as FlatNode}
          />
        );
      }
      return null;
    }
    case "style-code-config":
      if (!clickedNode || !markdownNode?.id) return null;
      return <StyleWidgetConfigPanel node={clickedNode} />;
    case "style-code-add":
    case "style-code-container-add":
    case "style-code-outer-add":
      return <StyleWidgetAddPanel node={clickedNode} parentNode={markdownNode} childId={childId} />;
    case "style-code-update":
    case "style-code-container-update":
    case "style-code-outer-update":
      return (
        <StyleWidgetUpdatePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
          config={config}
        />
      );
    case "style-code-remove":
    case "style-code-container-remove":
    case "style-code-outer-remove":
      return (
        <StyleWidgetRemovePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
        />
      );
    case "style-li-element": {
      if (!clickedNode?.parentId) return null;
      const outerContainerNode = allNodes.get(clickedNode.parentId);
      if (markdownNode && outerContainerNode && action === "style-li-element") {
        return (
          <StyleLiElementPanel
            node={clickedNode}
            parentNode={markdownNode}
            outerContainerNode={outerContainerNode as FlatNode}
          />
        );
      }
      return null;
    }
    case "style-li-element-add":
    case "style-li-container-add":
      return (
        <StyleLiElementAddPanel node={clickedNode} parentNode={markdownNode} childId={childId} />
      );
    case "style-li-element-update":
    case "style-li-container-update":
      return (
        <StyleLiElementUpdatePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
          config={config}
        />
      );
    case "style-li-element-remove":
    case "style-li-container-remove":
      return (
        <StyleLiElementRemovePanel
          node={clickedNode}
          parentNode={markdownNode}
          className={className}
          childId={childId}
        />
      );
    case "setup-codehook":
      return paneNode ? (
        <StyleCodeHookPanel node={paneNode} availableCodeHooks={availableCodeHooks} />
      ) : null;
    default:
      console.log(`SettingsPanel miss on ${action}`);
      return null;
  }
};

const SettingsPanel = ({
  config = null,
  availableCodeHooks = [],
}: {
  config?: Config | null;
  availableCodeHooks?: string[];
}) => {
  const signal = useStore(settingsPanelStore);
  const ctx = getCtx();
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  if (!signal) return null;

  const isPanelMinimized =
    signal.minimized === true || (userHasInteracted && signal.expanded === false);

  const allNodes = ctx.allNodes.get();

  const clickedNode = allNodes.get(signal.nodeId) as FlatNode | undefined;
  if (!clickedNode && signal.action !== `debug`) return null;

  let panel;
  if (signal.action === "debug") {
    panel = getPanel(config, "debug", null, availableCodeHooks);
  } else if (clickedNode) {
    const paneId =
      clickedNode.nodeType === "Pane"
        ? clickedNode.id
        : ctx.getClosestNodeTypeFromId(signal.nodeId, "Pane");
    const paneNode =
      clickedNode.nodeType === "Pane"
        ? clickedNode
        : paneId
          ? (allNodes.get(paneId) as FlatNode)
          : undefined;

    const childNodeIds = paneNode ? ctx.getChildNodeIDs(paneId) : [];
    const childNodes = childNodeIds
      .map((id) => allNodes.get(id))
      .filter((node): node is FlatNode => !!node);

    if (clickedNode.nodeType === "Pane") {
      panel = getPanel(config, signal.action, null, availableCodeHooks, paneNode, childNodes, 1);
    } else {
      panel = getPanel(
        config,
        signal.action,
        clickedNode,
        availableCodeHooks,
        paneNode,
        childNodes,
        signal.layer,
        signal.className,
        signal.childId
      );
    }
  }

  if (!panel) return null;
  const thisPanel = (
    <div
      className="bg-white w-full md:w-[500px] rounded-t-lg border-t border-x border-gray-200"
      style={
        !isPanelMinimized
          ? { minHeight: "200px", maxHeight: "50vh", overflowY: "auto" }
          : { height: "60px", overflowY: "hidden" }
      }
    >
      <div key={clickedNode?.id || `debug`} className="p-4">
        {panel}
      </div>
    </div>
  );

  const handleTogglePanel = () => {
    setUserHasInteracted(true);

    if (isPanelMinimized) {
      ctx.toolModeValStore.set({ value: "styles" });

      if (
        clickedNode &&
        clickedNode.nodeType === "TagElement" &&
        "tagName" in clickedNode &&
        ["p", "h2", "h3", "h4", "h5", "ol"].includes(clickedNode.tagName)
      ) {
        styleElementInfoStore.set({
          markdownParentId: clickedNode.parentId,
          tagName: clickedNode.tagName,
          overrideNodeId: null,
          className: null,
        });
      }
    } else {
      resetStyleElementInfo();
    }

    settingsPanelStore.set({
      ...signal,
      minimized: !isPanelMinimized,
      expanded: isPanelMinimized,
    });
  };

  return (
    <div id="settings-panel" className="relative bg-transparent flex flex-col items-end">
      <div className="absolute left-0 z-10 inline-flex space-x-2" style={{ top: `-3.5rem` }}>
        {isPanelMinimized ? (
          <button
            onClick={handleTogglePanel}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-myorange hover:text-white transition-colors group border border-gray-200"
            aria-label={isPanelMinimized ? `Show Settings Panel` : `Hide Settings Panel`}
            title={isPanelMinimized ? `Show Settings Panel` : `Hide Settings Panel`}
          >
            <ChevronDoubleUpIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        ) : null}
        <button
          onClick={() => {
            resetStyleElementInfo();
            settingsPanelStore.set(null);
          }}
          className="p-2 bg-white rounded-full shadow-lg hover:bg-myorange hover:text-white transition-colors group border border-gray-200"
          aria-label="Close settings panel"
          title="Close settings panel"
        >
          <ChevronDoubleDownIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>
      {isPanelMinimized ? <div onClick={handleTogglePanel}>{thisPanel}</div> : <>{thisPanel}</>}
    </div>
  );
};

export default SettingsPanel;
