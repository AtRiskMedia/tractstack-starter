import { getCtx } from "@/store/nodes.ts";
import { useStore } from "@nanostores/react";
import { styleElementInfoStore } from "@/store/storykeep.ts";
import AddPanePanel from "@/components/storykeep/controls/pane/AddPanePanel";
import PageCreationSelector from "@/components/storykeep/controls/pane/PageCreationSelector";
import { Pane } from "@/components/compositor-nodes/nodes/Pane.tsx";
import ConfigPanePanel from "@/components/storykeep/controls/pane/ConfigPanePanel.tsx";
import { PaneEraser } from "@/components/compositor-nodes/nodes/Pane_eraser.tsx";
import { PaneLayout } from "@/components/compositor-nodes/nodes/Pane_layout.tsx";
import { Markdown } from "@/components/compositor-nodes/nodes/Markdown.tsx";
import { BgPaneWrapper } from "@/components/compositor-nodes/nodes/BgPaneWrapper.tsx";
import { StoryFragment } from "@/components/compositor-nodes/nodes/StoryFragment.tsx";
import { NodeText } from "@/components/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeA } from "@/components/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeAEraser } from "@/components/compositor-nodes/nodes/tagElements/NodeA_eraser.tsx";
import { NodeButton } from "@/components/compositor-nodes/nodes/tagElements/NodeButton.tsx";
import { NodeButtonEraser } from "@/components/compositor-nodes/nodes/tagElements/NodeButton_eraser.tsx";
import { NodeImg } from "@/components/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { TagElement } from "@/components/compositor-nodes/nodes/TagElement.tsx";
import { NodeBasicTag } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import { NodeBasicTagInsert } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag_insert.tsx";
import { NodeBasicTagEraser } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag_eraser.tsx";
import { Widget } from "@/components/compositor-nodes/nodes/Widget.tsx";
import { showGuids } from "@/store/development.ts";
import { NodeWithGuid } from "@/components/compositor-nodes/NodeWithGuid.tsx";
import AnalyticsPanel from "@/components/storykeep/controls/recharts/AnalyticsPanel.tsx";
import StoryFragmentConfigPanel from "@/components/storykeep/controls/storyfragment/StoryFragmentConfigPanel";
import StoryFragmentTitlePanel from "@/components/storykeep/controls/storyfragment/StoryFragmentPanel_title";
import ContextPaneTitlePanel from "@/components/storykeep/controls/context/ContextPaneConfig_title.tsx";
import ContextPanePanel from "@/components/storykeep/controls/context/ContextPaneConfig.tsx";
import PanelVisibilityWrapper from "./PanelVisibilityWrapper";
import { memo, type ReactElement, useEffect, useState } from "react";
import type { NodeProps, StoryFragmentNode, PaneNode, BaseNode, FlatNode } from "@/types.ts";
import { NodeBasicTag_settings } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag_settings.tsx";
import { getType } from "@/utils/nodes/type-guards";

function parseCodeHook(node: BaseNode | FlatNode) {
  if ("codeHookParams" in node && Array.isArray(node.codeHookParams)) {
    const regexpHook =
      /^(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*)\)$/;
    const hookMatch = node.copy?.match(regexpHook);

    if (!hookMatch) return null;

    return {
      hook: hookMatch[1],
      value1: node.codeHookParams[0] || null,
      value2: node.codeHookParams[1] || null,
      value3: node.codeHookParams[2] || "",
    };
  }

  if ("children" in node && Array.isArray(node.children)) {
    const firstChild = node.children[0];
    if (!firstChild?.value) return null;

    const regexpHook =
      /(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*?)\)/;
    const regexpValues = /((?:[^\\|]+|\\\|?)+)/g;
    const hookMatch = firstChild.value.match(regexpHook);

    if (!hookMatch) return null;

    const hook = hookMatch[1];
    const hookValuesRaw = hookMatch[2].match(regexpValues);

    return {
      hook,
      value1: hookValuesRaw?.[0] || null,
      value2: hookValuesRaw?.[1] || null,
      value3: hookValuesRaw?.[2] || "",
    };
  }

  return null;
}

const getElement = (node: BaseNode | FlatNode, props: NodeProps): ReactElement => {
  if (node === undefined) return <></>;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;
  const hasPanes = useStore(getCtx(props).hasPanes);
  const isTemplate = useStore(getCtx(props).isTemplate);
  const sharedProps = { nodeId: node.id, ctx: props.ctx };
  const type = getType(node);
  switch (type) {
    case "Markdown":
      return <Markdown {...sharedProps} />;

    case "StoryFragment": {
      const sf = node as StoryFragmentNode;
      if (!isPreview) getCtx(props).hasTitle.set(!(!sf.slug || !sf.title));
      return (
        <>
          {!(sf.slug && sf.title) ? (
            <StoryFragmentTitlePanel nodeId={props.nodeId} />
          ) : !hasPanes && sf.slug && sf.title && !isPreview ? (
            <PageCreationSelector
              nodeId={props.nodeId}
              ctx={getCtx(props)}
              isTemplate={isTemplate}
            />
          ) : (
            <>
              <PanelVisibilityWrapper
                nodeId={props.nodeId}
                panelType="storyfragment"
                ctx={getCtx(props)}
              >
                <StoryFragmentConfigPanel nodeId={props.nodeId} config={props.config!} />
              </PanelVisibilityWrapper>
              <AnalyticsPanel nodeId={props.nodeId} />
              <StoryFragment {...sharedProps} />
            </>
          )}
        </>
      );
    }

    case "Pane": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      const paneNodes = getCtx(props).getChildNodeIDs(node.id);
      const paneNode = node as PaneNode;
      if (paneNode.isContextPane) {
        if (!isPreview) getCtx(props).hasTitle.set(!(!paneNode.slug || !paneNode.title));
        return (
          <>
            {!isPreview && !(paneNode.slug && paneNode.title) ? (
              <ContextPaneTitlePanel nodeId={node.id} />
            ) : !isPreview ? (
              <ContextPanePanel nodeId={node.id} />
            ) : null}
            {!isPreview && <AnalyticsPanel nodeId={node.id} />}
            <div>
              <Pane {...sharedProps} />
              {!isPreview && paneNode.slug && paneNode.title && paneNodes.length === 0 && (
                <PanelVisibilityWrapper nodeId={node.id} panelType="add" ctx={getCtx(props)}>
                  <AddPanePanel
                    nodeId={node.id}
                    first={true}
                    ctx={getCtx(props)}
                    isContextPane={true}
                  />
                </PanelVisibilityWrapper>
              )}
            </div>
          </>
        );
      }

      const storyFragmentId = getCtx(props).getClosestNodeTypeFromId(node.id, "StoryFragment");
      const storyFragment = getCtx(props).allNodes.get().get(storyFragmentId) as StoryFragmentNode;
      const firstPane = storyFragment?.paneIds?.length && storyFragment.paneIds[0];
      if (isPreview) return <Pane {...sharedProps} />;
      return (
        <>
          {storyFragment && firstPane === node.id && (
            <PanelVisibilityWrapper nodeId={`${node.id}-0`} panelType="add" ctx={getCtx(props)}>
              <AddPanePanel nodeId={node.id} first={true} ctx={getCtx(props)} />
            </PanelVisibilityWrapper>
          )}
          <div className="py-0.5">
            <PanelVisibilityWrapper nodeId={node.id} panelType="settings" ctx={getCtx(props)}>
              <ConfigPanePanel nodeId={node.id} />
            </PanelVisibilityWrapper>
            {toolModeVal === `eraser` ? (
              <PaneEraser {...sharedProps} />
            ) : toolModeVal === `layout` ? (
              <PaneLayout {...sharedProps} />
            ) : (
              <Pane {...sharedProps} />
            )}
          </div>
          <PanelVisibilityWrapper nodeId={node.id} panelType="add" ctx={getCtx(props)}>
            <AddPanePanel nodeId={node.id} first={false} ctx={getCtx(props)} />
          </PanelVisibilityWrapper>
        </>
      );
    }

    case "BgPane":
      return <BgPaneWrapper {...sharedProps} />;
    case "TagElement":
      return <TagElement {...sharedProps} />;
    // tag elements
    case "h2":
    case "h3":
    case "h4":
    case "ol":
    case "ul":
    case "li":
    case "aside":
    case "p": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `insert`) return <NodeBasicTagInsert {...sharedProps} tagName={type} />;
      else if (toolModeVal === `eraser`)
        return <NodeBasicTagEraser {...sharedProps} tagName={type} />;
      else if (toolModeVal === `move`)
        return <NodeBasicTag_settings {...sharedProps} tagName={type} />;
      return <NodeBasicTag {...sharedProps} tagName={type} />;
    }

    case "strong":
    case "em":
      return <NodeBasicTag {...sharedProps} tagName={type} />;

    case "text":
      return <NodeText {...sharedProps} />;
    case "button": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`) return <NodeButtonEraser {...sharedProps} />;
      return <NodeButton {...sharedProps} />;
    }
    case "a": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`) return <NodeAEraser {...sharedProps} />;
      return <NodeA {...sharedProps} />;
    }
    case "img":
      return <NodeImg {...sharedProps} />;
    case "code": {
      const hookData = parseCodeHook(node);
      return hookData ? <Widget {...hookData} {...sharedProps} /> : <></>;
    }
    case "impression":
      return <></>;
    default:
      console.warn(`Node.tsx miss on ${type}`);
      return <></>;
  }
};

const Node = memo((props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;

  const {
    markdownParentId,
    tagName: styleTagName,
    overrideNodeId,
  } = useStore(styleElementInfoStore, { keys: ["markdownParentId", "tagName", "overrideNodeId"] });

  // Subscribe to edit lock state for this node
  const [isEditLocked, setIsEditLocked] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsEditLocked(getCtx(props).isEditLocked(props.nodeId));

    // Subscribe to changes in edit lock
    const unsubscribe = getCtx(props).editingNodeId.subscribe((editingId) => {
      setIsEditLocked(editingId === props.nodeId);
    });

    return () => unsubscribe();
  }, [props.nodeId]);

  useEffect(() => {
    // Only subscribe to notifications if not edit-locked
    if (!isEditLocked) {
      const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, () => {});
      return () => unsubscribe();
    }
  }, [props.nodeId, isEditLocked]);

  const nodeTagName = node?.tagName || "";
  const isBlockTag = ["h2", "h3", "h4", "ol", "ul", "li", "p"].includes(nodeTagName);

  const parentNode = node?.parentId ? getCtx(props).allNodes.get().get(node.parentId) : null;
  const isTopLevelBlock = isBlockTag && parentNode?.nodeType === "Markdown";

  const closestMarkdownId = getCtx(props).getClosestNodeTypeFromId(props.nodeId, "Markdown");
  const isEditableMode = [`text`].includes(getCtx(props).toolModeValStore.get().value);

  const isHighlighted =
    isTopLevelBlock &&
    closestMarkdownId === markdownParentId &&
    nodeTagName === styleTagName &&
    !isEditableMode;

  const isOverride = overrideNodeId === props.nodeId;

  const highlightStyle = isHighlighted
    ? {
        outline: isOverride
          ? "2.5px solid rgba(255, 165, 0, 0.5)"
          : "0.5px dashed rgba(0, 0, 0, 0.3)",
      }
    : {};

  const element = getElement(node, props);

  if (!isPreview && showGuids.get()) {
    return <NodeWithGuid {...props} element={element} />;
  }

  if (isTopLevelBlock) {
    return <div style={highlightStyle}>{element}</div>;
  }

  return element;
});

export default Node;
