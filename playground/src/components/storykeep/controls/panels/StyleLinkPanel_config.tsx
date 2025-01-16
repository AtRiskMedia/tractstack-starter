import { useState, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { preParseBunny } from "@/utils/concierge/preParse_Bunny";
import ActionBuilderField from "../fields/ActionBuilderField";
import type { FlatNode, Config } from "@/types";

interface StyleLinkConfigPanelProps {
  node: FlatNode;
  config: Config;
}

const StyleLinkConfigPanel = ({ node, config }: StyleLinkConfigPanelProps) => {
  if (!node?.tagName || (node.tagName !== "a" && node.tagName !== "button")) {
    return null;
  }

  const [callbackPayload, setCallbackPayload] = useState(node.buttonPayload?.callbackPayload || "");

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-link",
      expanded: true,
    });
  };

  const updateStore = () => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const linkNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    const markdownId = ctx.getClosestNodeTypeFromId(node.id, "Markdown");
    if (!linkNode || !markdownId) return;
    const storyFragmentId = ctx.getClosestNodeTypeFromId(node.id, "StoryFragment");
    const storyFragment = storyFragmentId ? allNodes.get(storyFragmentId) : null;
    const slug: string =
      storyFragment && "slug" in storyFragment ? (storyFragment.slug as string) : "";
    const isContext = ctx.getIsContextPane(markdownId);
    const lexedPayload = lispLexer(callbackPayload);
    const targetUrl = lexedPayload && preParseAction(lexedPayload, slug, isContext, config);
    const bunnyPayload = lexedPayload && preParseBunny(lexedPayload);
    const isExternalUrl = typeof targetUrl === "string" && targetUrl.substring(0, 8) === "https://";
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
  };

  useEffect(() => {
    setCallbackPayload(node.buttonPayload?.callbackPayload || "");
  }, [node]);

  useEffect(() => {
    updateStore();
  }, [callbackPayload]);

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
          {/* The parent container that will scroll */}
          <div className="relative min-h-[400px] max-h-[60vh] overflow-y-auto">
            <div className="absolute inset-x-0">
              <label className="block text-sm text-mydarkgrey mb-2">Callback Payload</label>
              <ActionBuilderField
                value={callbackPayload}
                onChange={setCallbackPayload}
                contentMap={contentMap.get()}
              />
              <p className="text-sm text-mydarkgrey mt-2">
                Use a lisp expression like (goto (storyFragmentPane hello why-choose)) or an
                https:// URL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
