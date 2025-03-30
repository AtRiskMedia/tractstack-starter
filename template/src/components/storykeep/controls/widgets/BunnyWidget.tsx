import { useState, useEffect } from "react";
import SingleParam from "../fields/SingleParam";
import { widgetMeta } from "@/constants";
import type { FlatNode } from "@/types";

interface BunnyWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

function BunnyWidget({ node, onUpdate }: BunnyWidgetProps) {
  // Initialize local state from node.codeHookParams
  const [embedUrl, setEmbedUrl] = useState(String(node.codeHookParams?.[0] || ""));
  const [title, setTitle] = useState(String(node.codeHookParams?.[1] || ""));

  // Get parameter metadata from the widgetMeta constant
  const widgetInfo = widgetMeta.bunny;

  // Sync local state with node prop changes
  useEffect(() => {
    setEmbedUrl(String(node.codeHookParams?.[0] || ""));
    setTitle(String(node.codeHookParams?.[1] || ""));
  }, [node]);

  const handleEmbedUrlChange = (value: string) => {
    setEmbedUrl(value);
    onUpdate([value, title]);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onUpdate([embedUrl, value]);
  };

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    try {
      if (!url) return false;
      new URL(url);
      return (
        url.includes("//iframe.mediadelivery.net/embed/") || url.includes("//video.bunnycdn.com/")
      );
    } catch (e) {
      return false;
    }
  };

  const urlStatus = embedUrl
    ? isValidUrl(embedUrl)
      ? { valid: true, message: "Valid Bunny video URL" }
      : { valid: false, message: "URL should be a valid Bunny embed URL" }
    : { valid: false, message: "Please enter a Bunny embed URL" };

  return (
    <div className="space-y-4">
      <SingleParam
        label={widgetInfo.parameters[0].label}
        value={embedUrl}
        onChange={handleEmbedUrlChange}
      />
      {!urlStatus.valid && embedUrl && (
        <div className="text-xs text-red-500 mt-1">{urlStatus.message}</div>
      )}

      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={title}
        onChange={handleTitleChange}
      />

      {embedUrl && urlStatus.valid && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Preview</h4>
          <div className="bg-gray-100 p-2 rounded">
            <div className="text-xs text-gray-500 truncate">
              Video URL: <span className="font-mono">{embedUrl}</span>
            </div>
            <div className="text-xs text-gray-500">Title: {title || "(No title)"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BunnyWidget;
