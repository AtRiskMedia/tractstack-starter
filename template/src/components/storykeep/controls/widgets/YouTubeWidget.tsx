import { useEffect, useState } from "react";
import SingleParam from "../fields/SingleParam";
import { widgetMeta } from "@/constants";
import type { FlatNode } from "@/types";

interface YouTubeWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

function YouTubeWidget({ node, onUpdate }: YouTubeWidgetProps) {
  const params = node.codeHookParams || [];
  const embedCode = String(params[0] || "");
  const title = String(params[1] || "");

  const [isInitialized, setIsInitialized] = useState(false);

  // Get parameter metadata from the widgetMeta constant
  const widgetInfo = widgetMeta.youtube;

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const handleEmbedCodeChange = (value: string) => {
    if (!isInitialized) return;
    onUpdate([value, title]);
  };

  const handleTitleChange = (value: string) => {
    if (!isInitialized) return;
    onUpdate([embedCode, value]);
  };

  return (
    <div className="space-y-4">
      <SingleParam
        label={widgetInfo.parameters[0].label}
        value={embedCode}
        onChange={handleEmbedCodeChange}
      />
      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={title}
        onChange={handleTitleChange}
      />

      {embedCode && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Preview</h4>
          <div className="bg-gray-100 p-2 rounded">
            <div className="text-xs text-gray-500">
              YouTube ID: <span className="font-mono">{embedCode}</span>
            </div>
            <div className="text-xs text-gray-500">Title: {title || "(No title)"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YouTubeWidget;
