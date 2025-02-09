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
  const [callbackPayload, setCallbackPayload] = useState(node.buttonPayload?.callbackPayload || "");

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const markdownId = ctx.getClosestNodeTypeFromId(node.id, "Markdown");
  const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
  const storyFragment = storyFragmentId ? allNodes.get(storyFragmentId) : null;
  const slug: string =
    storyFragment && "slug" in storyFragment ? (storyFragment.slug as string) : "";
  const isContext = ctx.getIsContextPane(markdownId);

  // Initialize without triggering store update
  useEffect(() => {
    setCallbackPayload(node.buttonPayload?.callbackPayload || "");
    setIsInitialized(true);
  }, [node]);

  // Handle updates when callback payload changes
  useEffect(() => {
    if (!isInitialized) return;

    // Analyze the value to see if it's a complete selection
    try {
      const match = callbackPayload.match(/\(goto\s+\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(" ").filter(Boolean);
        if (parts.length > 0) {
          const target = parts[0];
          if (GOTO_TARGETS[target]) {
            let shouldUpdate = false;

            // For URL type, always update (it's free form text)
            if (target === "url") {
              shouldUpdate = true;
            }
            // For subcommands, need both target and subcommand
            else if (GOTO_TARGETS[target].subcommands) {
              shouldUpdate = parts.length > 1;
            }
            // For params, check if all required params are present
            else if (GOTO_TARGETS[target].requiresParam) {
              if (GOTO_TARGETS[target].requiresThirdParam) {
                shouldUpdate = parts.length > 3;
              } else if (GOTO_TARGETS[target].requiresSecondParam) {
                shouldUpdate = parts.length > 2;
              } else {
                shouldUpdate = parts.length > 1;
              }
            }
            // For simple targets with no additional requirements
            else {
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
              if (!linkNode || !markdownId) return;

              const lexedPayload = lispLexer(callbackPayload);
              const targetUrl =
                lexedPayload && preParseAction(lexedPayload, slug, isContext, config);
              const bunnyPayload = lexedPayload && preParseBunny(lexedPayload);
              const isExternalUrl =
                typeof targetUrl === "string" && targetUrl.substring(0, 8) === "https://";

              linkNode.href = isExternalUrl ? targetUrl : targetUrl || "#";
              linkNode.tagName = !targetUrl ? "button" : "a";
              linkNode.buttonPayload = {
                ...linkNode.buttonPayload,
                callbackPayload,
                buttonClasses: linkNode.buttonPayload?.buttonClasses ?? {},
                buttonHoverClasses: linkNode.buttonPayload?.buttonHoverClasses ?? {},
                ...(isExternalUrl ? { isExternalUrl: true } : {}),
                ...(bunnyPayload ? { bunnyPayload } : {}),
              };

              ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error analyzing action value:", e);
    }
  }, [isInitialized, callbackPayload, node.id, config, allNodes, ctx, markdownId, slug, isContext]);

  const handleChange = (value: string) => {
    setCallbackPayload(value);
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
