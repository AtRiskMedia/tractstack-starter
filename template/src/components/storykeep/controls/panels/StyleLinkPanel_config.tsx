import { useState, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { preParseBunny } from "@/utils/concierge/preParse_Bunny";
import ActionBuilderField from "../fields/ActionBuilderField";
import { GOTO_TARGETS } from "@/constants";
import type { FlatNode, Config } from "@/types";

interface StyleLinkConfigPanelProps {
  node: FlatNode;
  config: Config;
}

const StyleLinkConfigPanel = ({ node, config }: StyleLinkConfigPanelProps) => {
  if (!node?.tagName || (node.tagName !== "a" && node.tagName !== "button")) {
    return null;
  }

  const [isInitialized, setIsInitialized] = useState(false);
  const [callbackPayload, setCallbackPayload] = useState("");

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownId = ctx.getClosestNodeTypeFromId(node.id, "Markdown");
  const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
  const storyFragment = storyFragmentId ? allNodes.get(storyFragmentId) : null;
  const slug = storyFragment && "slug" in storyFragment ? (storyFragment.slug as string) : "";
  const isContext = ctx.getIsContextPane(markdownId);

  // Initialize state with current node data
  useEffect(() => {
    setCallbackPayload(node.buttonPayload?.callbackPayload || "");
    setIsInitialized(true);
  }, [node]);

  const updateNode = (newCallbackPayload: string) => {
    try {
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!linkNode || !markdownId) return;

      const lexedPayload = lispLexer(newCallbackPayload);
      const targetUrl = lexedPayload && preParseAction(lexedPayload, slug, isContext, config);
      const bunnyPayload = lexedPayload && preParseBunny(lexedPayload);
      const isExternalUrl = typeof targetUrl === "string" && targetUrl.startsWith("https://");

      // Preserve existing button payload properties or initialize new ones
      const existingButtonPayload = linkNode.buttonPayload || {
        buttonClasses: {},
        buttonHoverClasses: {},
        callbackPayload: "",
      };

      linkNode.href = isExternalUrl ? targetUrl : targetUrl || "#";
      linkNode.tagName = !targetUrl ? "button" : "a";
      linkNode.buttonPayload = {
        ...existingButtonPayload,
        callbackPayload: newCallbackPayload,
        buttonClasses: existingButtonPayload.buttonClasses || {},
        buttonHoverClasses: existingButtonPayload.buttonHoverClasses || {},
        ...(isExternalUrl ? { isExternalUrl: true } : {}),
        ...(bunnyPayload ? { bunnyPayload } : {}),
      };

      ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    } catch (error) {
      console.error("Error updating node:", error);
    }
  };

  // Process callback payload changes
  useEffect(() => {
    if (!isInitialized) return;

    const match = callbackPayload.match(/\(goto\s+\(([^)]+)\)/);
    if (!match) return;

    const parts = match[1].split(" ").filter(Boolean);
    if (parts.length === 0) return;

    const target = parts[0];
    const targetConfig = GOTO_TARGETS[target];
    if (!targetConfig) return;

    let isComplete = false;

    if (target === "url") {
      isComplete = parts.length > 1;
    } else if (targetConfig.subcommands) {
      isComplete = parts.length > 1;
    } else if (targetConfig.requiresParam) {
      if (targetConfig.requiresSecondParam) {
        isComplete = parts.length > 2;
      } else {
        isComplete = parts.length > 1;
      }
    } else {
      isComplete = true;
    }

    if (isComplete) {
      updateNode(callbackPayload);
    }
  }, [callbackPayload, isInitialized, node.id, config, allNodes, ctx, markdownId, slug, isContext]);

  const handleChange = (value: string) => {
    setCallbackPayload(value);
    setTimeout(() => settingsPanelStore.set(null), 500);
  };

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-link",
      expanded: true,
    });
  };

  return (
    <div className="relative">
      <div className="space-y-4 max-w-md w-full">
        <div className="flex flex-row flex-nowrap justify-between">
          <h2 className="text-xl font-bold">Link Settings</h2>
          <button
            className="text-myblue hover:text-black"
            title="Return to style panel"
            onClick={handleCloseConfig}
          >
            Go Back
          </button>
        </div>

        <div className="space-y-2">
          <div className="relative min-h-[400px] max-h-[60vh] overflow-y-auto">
            <div className="absolute inset-x-0">
              <label className="block text-sm text-mydarkgrey mb-2">Callback Payload</label>
              <ActionBuilderField
                value={callbackPayload}
                onChange={handleChange}
                slug={slug}
                contentMap={contentMap.get()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
