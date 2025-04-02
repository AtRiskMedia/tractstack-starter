import { useState, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { preParseBunny } from "@/utils/concierge/preParse_Bunny";
import ActionBuilderField from "../fields/ActionBuilderField";
import BunnyMomentSelector from "../fields/BunnyMomentSelector";
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
  const [actionType, setActionType] = useState<"goto" | "bunnyMoment">("goto");

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownId = ctx.getClosestNodeTypeFromId(node.id, "Markdown");
  const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
  const storyFragment = storyFragmentId ? allNodes.get(storyFragmentId) : null;
  const slug = storyFragment && "slug" in storyFragment ? (storyFragment.slug as string) : "";
  const isContext = ctx.getIsContextPane(markdownId);

  useEffect(() => {
    const currentPayload = node.buttonPayload?.callbackPayload || "";
    setCallbackPayload(currentPayload);
    setActionType(currentPayload.startsWith("(bunnyMoment") ? "bunnyMoment" : "goto");
    setIsInitialized(true);
  }, [node]);

  const updateNode = (newCallbackPayload: string) => {
    try {
      const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!linkNode || !markdownId) return;

      const lexedPayload = lispLexer(newCallbackPayload);
      let targetUrl = null;
      if (newCallbackPayload.startsWith("(goto")) {
        targetUrl = lexedPayload && preParseAction(lexedPayload, slug, isContext, config);
      }
      const bunnyPayload = lexedPayload && preParseBunny(lexedPayload);
      const isExternalUrl = typeof targetUrl === "string" && targetUrl.startsWith("https://");
      const existingButtonPayload = linkNode.buttonPayload || {
        buttonClasses: {},
        buttonHoverClasses: {},
        callbackPayload: "",
      };

      if (newCallbackPayload.startsWith("(bunnyMoment")) {
        linkNode.tagName = "button";
        linkNode.href = "#";
      } else {
        linkNode.href = isExternalUrl ? targetUrl : targetUrl || "#";
        linkNode.tagName = !targetUrl || bunnyPayload ? "button" : "a";
      }

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

  useEffect(() => {
    if (!isInitialized) return;

    if (callbackPayload.startsWith("(bunnyMoment")) {
      const match = callbackPayload.match(/\(bunnyMoment\s+\(\s*([^\s]+)\s+(\d+)\s*\)\)/);
      if (match && match[1] && match[2]) {
        updateNode(callbackPayload);
      }
      return;
    }

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
  };

  const handleActionTypeChange = (type: "goto" | "bunnyMoment") => {
    setActionType(type);
    if (type === "bunnyMoment") {
      setCallbackPayload("(bunnyMoment ( ))");
    } else {
      setCallbackPayload("");
    }
  };

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-link",
      expanded: true,
    });
  };

  const renderActionBuilder = () => {
    switch (actionType) {
      case "bunnyMoment":
        return <BunnyMomentSelector value={callbackPayload} onChange={handleChange} />;
      case "goto":
      default:
        return (
          <ActionBuilderField
            value={callbackPayload}
            onChange={handleChange}
            slug={slug}
            contentMap={contentMap.get()}
          />
        );
    }
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

        <div className="space-y-2 mb-4">
          <label className="block text-sm text-gray-700">Action Type</label>
          <select
            value={actionType}
            onChange={(e) => handleActionTypeChange(e.target.value as "goto" | "bunnyMoment")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="goto">Navigation Action</option>
            <option value="bunnyMoment">Video Moment Action</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {actionType === "goto"
              ? "Create a link to navigate to another page or section"
              : "Jump to a specific moment in a video on this page"}
          </p>
        </div>

        <div className="space-y-2">
          <div className="relative min-h-[400px] max-h-[60vh] overflow-y-auto">
            <div className="absolute inset-x-0">
              <label className="block text-sm text-mydarkgrey mb-2">
                {actionType === "goto" ? "Callback Payload" : "Video Moment Settings"}
              </label>
              {renderActionBuilder()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
