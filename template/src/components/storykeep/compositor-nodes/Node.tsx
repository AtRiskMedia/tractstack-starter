import { getCtx, NodesContext } from "@/store/nodes.ts";
import AddPanePanel from "@/components/storykeep/controls/pane/AddPanePanel";
import { Pane } from "@/components/storykeep/compositor-nodes/nodes/Pane.tsx";
import { PaneAdd } from "@/components/storykeep/compositor-nodes/nodes/Pane_add.tsx";
import { PaneConfig } from "@/components/storykeep/compositor-nodes/nodes/Pane_config.tsx";
import { PaneEraser } from "@/components/storykeep/compositor-nodes/nodes/Pane_eraser.tsx";
import { PaneLayout } from "@/components/storykeep/compositor-nodes/nodes/Pane_layout.tsx";
import { Markdown } from "@/components/storykeep/compositor-nodes/nodes/Markdown.tsx";
import { BgPaneWrapper } from "@/components/storykeep/compositor-nodes/nodes/BgPaneWrapper.tsx";
import { StoryFragment } from "@/components/storykeep/compositor-nodes/nodes/StoryFragment.tsx";
import { NodeText } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeText.tsx";
import { NodeA } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA.tsx";
import { NodeAEraser } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeA_eraser.tsx";
import { NodeButton } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeButton.tsx";
import { NodeButtonEraser } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeButton_eraser.tsx";
import { NodeImg } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeImg.tsx";
import { TagElement } from "@/components/storykeep/compositor-nodes/nodes/TagElement.tsx";
import { NodeBasicTag } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag.tsx";
import { NodeBasicTagInsert } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag_insert.tsx";
import { NodeBasicTagEraser } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag_eraser.tsx";
import { Widget } from "@/components/storykeep/compositor-nodes/nodes/Widget.tsx";
import { timestampNodeId } from "@/utils/common/helpers.ts";
import { showGuids } from "@/store/development.ts";
import { NodeWithGuid } from "@/components/storykeep/compositor-nodes/NodeWithGuid.tsx";
import AnalyticsPanel from "@/components/storykeep/controls/recharts/AnalyticsPanel.tsx";
import StoryFragmentConfigPanel from "@/components/storykeep/controls/storyfragment/StoryFragmentConfigPanel";
import StoryFragmentTitlePanel from "@/components/storykeep/controls/storyfragment/StoryFragmentPanel_title";
import ContextPaneTitlePanel from "@/components/storykeep/controls/context/ContextPaneConfig_title.tsx";
import ContextPanePanel from "@/components/storykeep/controls/context/ContextPaneConfig.tsx";
import { memo, type ReactElement } from "react";
import type { Config, StoryFragmentNode, PaneNode, BaseNode, FlatNode } from "@/types.ts";
import { NodeBasicTag_settings } from "@/components/storykeep/compositor-nodes/nodes/tagElements/NodeBasicTag_settings.tsx";

export type NodeProps = {
  nodeId: string;
  config?: Config;
  ctx?: NodesContext;
  first?: boolean;
};

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

export const getType = (node: BaseNode | FlatNode): string => {
  let type = node.nodeType as string;
  if ("tagName" in node) {
    type = node.tagName;
  }
  return type;
};

const getElement = (node: BaseNode | FlatNode, props: NodeProps): ReactElement => {
  if (node === undefined) return <></>;
  const sharedProps = { nodeId: node.id, ctx: props.ctx };
  const type = getType(node);
  switch (type) {
    // generic nodes, not tag (html) elements
    case "Markdown":
      return <Markdown {...sharedProps} key={timestampNodeId(node.id)} />;

    case "StoryFragment": {
      const sf = node as StoryFragmentNode;
      return (
        <>
          {!(sf.slug && sf.title) ? (
            <StoryFragmentTitlePanel nodeId={props.nodeId} />
          ) : (
            <StoryFragmentConfigPanel nodeId={props.nodeId} config={props.config!} />
          )}
          <AnalyticsPanel nodeId={props.nodeId} />
          <StoryFragment {...sharedProps} key={timestampNodeId(node.id)} />
          {sf.slug && sf.title && sf.paneIds.length === 0 && (
            <AddPanePanel
              nodeId={props.nodeId}
              first={true}
              ctx={getCtx(props)}
              isStoryFragment={true}
            />
          )}
        </>
      );
    }

    case "Pane": {
      const toolModeVal = getCtx(props).toolModeValStore.get().value;
      const isContextPane = getCtx(props).getIsContextPane(node.id);
      const paneNodes = getCtx(props).getChildNodeIDs(node.id);
      const paneNode = node as PaneNode;
      if (isContextPane)
        return (
          <>
            {!(paneNode.slug && paneNode.title) ? (
              <ContextPaneTitlePanel nodeId={node.id} />
            ) : (
              <ContextPanePanel nodeId={node.id} />
            )}
            <AnalyticsPanel nodeId={node.id} />
            <div className="bg-white">
              <Pane {...sharedProps} key={timestampNodeId(node.id)} />
              {paneNode.slug && paneNode.title && paneNodes.length === 0 && (
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
      if (toolModeVal === `eraser` && !isContextPane)
        return <PaneEraser {...sharedProps} key={timestampNodeId(node.id)} />;
      if (toolModeVal === `layout` && !isContextPane) {
        return <PaneLayout {...sharedProps} key={timestampNodeId(node.id)} />;
      } else if (toolModeVal === `settings` && !isContextPane)
        return <PaneConfig {...sharedProps} key={timestampNodeId(node.id)} />;
      else if (toolModeVal === `pane` && !isContextPane) {
        const storyFragmentId = getCtx(props).getClosestNodeTypeFromId(node.id, "StoryFragment");
        const storyFragment = getCtx(props)
          .allNodes.get()
          .get(storyFragmentId) as StoryFragmentNode;
        const firstPane = storyFragment.paneIds.length && storyFragment.paneIds[0];
        if (storyFragment)
          return (
            <PaneAdd
              {...sharedProps}
              first={firstPane === node.id}
              key={timestampNodeId(node.id)}
            />
          );
      }
      return <Pane {...sharedProps} key={timestampNodeId(node.id)} />;
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
      else if (toolModeVal === `settings`)
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

export const Node = memo((props: NodeProps) => {
  const node = getCtx(props).allNodes.get().get(props.nodeId) as FlatNode;
  if (showGuids.get()) {
    return <NodeWithGuid {...props} element={getElement(node, props)} />;
  }
  return getElement(node, props);
});
