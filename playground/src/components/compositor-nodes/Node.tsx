import { getCtx } from "@/store/nodes.ts";
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
import { timestampNodeId } from "@/utils/common/helpers.ts";
import { showGuids } from "@/store/development.ts";
import { NodeWithGuid } from "@/components/compositor-nodes/NodeWithGuid.tsx";
import AnalyticsPanel from "@/components/storykeep/controls/recharts/AnalyticsPanel.tsx";
import StoryFragmentConfigPanel from "@/components/storykeep/controls/storyfragment/StoryFragmentConfigPanel";
import StoryFragmentTitlePanel from "@/components/storykeep/controls/storyfragment/StoryFragmentPanel_title";
import ContextPaneTitlePanel from "@/components/storykeep/controls/context/ContextPaneConfig_title.tsx";
import ContextPanePanel from "@/components/storykeep/controls/context/ContextPaneConfig.tsx";
import { memo, type ReactElement } from "react";
import type { NodeProps, StoryFragmentNode, PaneNode, BaseNode, FlatNode } from "@/types.ts";
import { NodeBasicTag_settings } from "@/components/compositor-nodes/nodes/tagElements/NodeBasicTag_settings.tsx";
import { getType } from "@/utils/nodes/type-guards";

// Helper function to parse code hooks
function parseCodeHook(node: BaseNode | FlatNode) {
  // First check if we have codeHookParams
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

  // Type guard to check if it's a FlatNode with children
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
  const sharedProps = { nodeId: node.id, ctx: props.ctx };
  const type = getType(node);
  switch (type) {
    case "Markdown":
      return <Markdown {...sharedProps} key={timestampNodeId(node.id)} />;

    case "StoryFragment": {
      const sf = node as StoryFragmentNode;
      return (
        <>
          {!(sf.slug && sf.title) ? (
            <StoryFragmentTitlePanel nodeId={props.nodeId} />
          ) : (
            <>
              <StoryFragmentConfigPanel nodeId={props.nodeId} config={props.config!} />
              <AnalyticsPanel nodeId={props.nodeId} />
              <StoryFragment {...sharedProps} key={timestampNodeId(node.id)} />
              {!isPreview && sf.slug && sf.title && sf.paneIds.length === 0 && (
                <PageCreationSelector nodeId={props.nodeId} ctx={getCtx(props)} />
              )}
            </>
          )}
        </>
      );
    }

    case "Pane": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      const paneNodes = getCtx(props).getChildNodeIDs(node.id);
      const paneNode = node as PaneNode;
      if (paneNode.isContextPane)
        return (
          <>
            {!isPreview && !(paneNode.slug && paneNode.title) ? (
              <ContextPaneTitlePanel nodeId={node.id} />
            ) : !isPreview ? (
              <ContextPanePanel nodeId={node.id} />
            ) : null}
            {!isPreview && <AnalyticsPanel nodeId={node.id} />}
            <div className="bg-white">
              <Pane {...sharedProps} key={timestampNodeId(node.id)} />
              {!isPreview && paneNode.slug && paneNode.title && paneNodes.length === 0 && (
                <AddPanePanel
                  nodeId={node.id}
                  first={true}
                  ctx={getCtx(props)}
                  isContextPane={true}
                />
              )}
            </div>
          </>
        );

      const storyFragmentId = getCtx(props).getClosestNodeTypeFromId(node.id, "StoryFragment");
      const storyFragment = getCtx(props).allNodes.get().get(storyFragmentId) as StoryFragmentNode;
      const firstPane = storyFragment?.paneIds?.length && storyFragment.paneIds[0];
      if (isPreview) return <Pane {...sharedProps} key={timestampNodeId(node.id)} />;
      return (
        <>
          {storyFragment && firstPane === node.id && (
            <AddPanePanel nodeId={node.id} first={true} ctx={getCtx(props)} />
          )}
          <div className="py-0.5">
            <ConfigPanePanel nodeId={node.id} />
            {toolModeVal === `eraser` ? (
              <PaneEraser {...sharedProps} key={timestampNodeId(node.id)} />
            ) : toolModeVal === `layout` ? (
              <PaneLayout {...sharedProps} key={timestampNodeId(node.id)} />
            ) : (
              <Pane {...sharedProps} key={timestampNodeId(node.id)} />
            )}
          </div>
          <AddPanePanel nodeId={node.id} first={false} ctx={getCtx(props)} />
        </>
      );
    }

    case "BgPane":
      return <BgPaneWrapper {...sharedProps} key={timestampNodeId(node.id)} />;
    case "TagElement":
      return <TagElement {...sharedProps} key={timestampNodeId(node.id)} />;
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
      if (toolModeVal === `insert`)
        return (
          <NodeBasicTagInsert {...sharedProps} tagName={type} key={timestampNodeId(node.id)} />
        );
      else if (toolModeVal === `eraser`)
        return (
          <NodeBasicTagEraser {...sharedProps} tagName={type} key={timestampNodeId(node.id)} />
        );
      else if (toolModeVal === `move`)
        return (
          <NodeBasicTag_settings {...sharedProps} tagName={type} key={timestampNodeId(node.id)} />
        );
      return <NodeBasicTag {...sharedProps} tagName={type} key={timestampNodeId(node.id)} />;
    }

    case "strong":
    case "em":
      return <NodeBasicTag {...sharedProps} tagName={type} key={timestampNodeId(node.id)} />;

    case "text":
      return <NodeText {...sharedProps} key={timestampNodeId(node.id)} />;
    case "button": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`)
        return <NodeButtonEraser {...sharedProps} key={timestampNodeId(node.id)} />;
      return <NodeButton {...sharedProps} key={timestampNodeId(node.id)} />;
    }
    case "a": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      if (toolModeVal === `eraser`)
        return <NodeAEraser {...sharedProps} key={timestampNodeId(node.id)} />;
      return <NodeA {...sharedProps} key={timestampNodeId(node.id)} />;
    }
    case "img":
      return <NodeImg {...sharedProps} key={timestampNodeId(node.id)} />;
    case "code": {
      const hookData = parseCodeHook(node);
      return hookData ? (
        <Widget {...hookData} {...sharedProps} key={timestampNodeId(node.id)} />
      ) : (
        <></>
      );
    }
    case "impression":
      return <></>;
    default:
      console.log(`Node.tsx miss on ${type}`);
      return <></>;
  }
};

const Node = memo((props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  const isPreview = getCtx(props).rootNodeId.get() === `tmp`;
  if (!isPreview && showGuids.get()) {
    return <NodeWithGuid {...props} element={getElement(node, props)} />;
  }
  return getElement(node, props);
});

export default Node;
