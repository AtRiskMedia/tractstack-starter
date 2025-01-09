import { useState, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { preParseBunny } from "@/utils/concierge/preParse_Bunny";
import type { FlatNode, Config } from "../../../../types";

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
      buttonClasses: linkNode.buttonPayload?.buttonClasses ?? {}, // Ensure buttonClasses exists
      buttonHoverClasses: linkNode.buttonPayload?.buttonHoverClasses ?? {}, // Ensure buttonHoverClasses exists
      ...(isExternalUrl ? { isExternalUrl: true } : {}),
      ...(bunnyPayload ? { bunnyPayload } : {}),
    };
    ctx.modifyNodes([{ ...linkNode, isChanged: true }]);
    ctx.notifyNode(markdownId);
  };

  useEffect(() => {
    setCallbackPayload(node.buttonPayload?.callbackPayload || "");
  }, [node]);

  useEffect(() => {
    updateStore();
  }, [callbackPayload]);

  return (
    <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
      <div className="space-y-4 max-w-md min-w-80">
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
          <label className="block text-sm text-mydarkgrey">Callback Payload</label>
          <div
            contentEditable
            onBlur={(e) => {
              const newPayload = e.currentTarget.textContent || "";
              setCallbackPayload(newPayload);
            }}
            className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
            style={{ minHeight: "1em", pointerEvents: "auto" }}
            suppressContentEditableWarning
          >
            {callbackPayload}
          </div>
          <p className="text-sm text-mydarkgrey mt-1">
            Use a lisp expression like (goto (storyFragmentPane hello why-choose)) or an https://
            URL
          </p>
        </div>
      </div>
    </div>
  );
};

export default StyleLinkConfigPanel;
