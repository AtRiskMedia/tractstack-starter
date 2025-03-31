import { useState, useEffect } from "react";
import SingleParam from "../fields/SingleParam";
import { widgetMeta } from "@/constants";
import { getCtx } from "@/store/nodes";
import type { FlatNode } from "@/types";

interface BunnyWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

function BunnyWidget({ node, onUpdate }: BunnyWidgetProps) {
  const [embedUrl, setEmbedUrl] = useState(String(node.codeHookParams?.[0] || ""));
  const [title, setTitle] = useState(String(node.codeHookParams?.[1] || ""));
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const widgetInfo = widgetMeta.bunny;

  useEffect(() => {
    setEmbedUrl(String(node.codeHookParams?.[0] || ""));
    setTitle(String(node.codeHookParams?.[1] || ""));
    validateUrl(String(node.codeHookParams?.[0] || ""));
  }, [node]);

  const checkForDuplicates = (url: string): boolean => {
    if (!url) return false;

    try {
      const videoId = extractVideoId(url);
      if (!videoId) return false;

      const ctx = getCtx();
      const existingVideos = ctx.getAllBunnyVideoInfo();

      // Check if this video ID already exists in another node
      return existingVideos.some(
        (video) => video.videoId === videoId && !(node.codeHookParams?.[0] || "").includes(videoId)
      );
    } catch (e) {
      console.error("Error checking for duplicates:", e);
      return false;
    }
  };

  const extractVideoId = (url: string): string | null => {
    try {
      const match = url.match(/embed\/([^/]+\/[^/?]+)/);
      return match ? match[1] : null;
    } catch (e) {
      console.error("Error extracting video ID:", e);
      return null;
    }
  };

  // Validate URL format and check for duplicates
  const validateUrl = (url: string): void => {
    if (!url) {
      setValidationError(null);
      setIsDuplicate(false);
      return;
    }

    const isValid = isValidUrl(url);
    if (!isValid) {
      setValidationError("URL should be a valid Bunny embed URL");
      setIsDuplicate(false);
      return;
    }

    const duplicate = checkForDuplicates(url);
    setIsDuplicate(duplicate);
    setValidationError(duplicate ? "This video is already used elsewhere in this page" : null);
  };

  const handleEmbedUrlChange = (value: string) => {
    setEmbedUrl(value);
    validateUrl(value);
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

  return (
    <div className="space-y-4">
      <SingleParam
        label={widgetInfo.parameters[0].label}
        value={embedUrl}
        onChange={handleEmbedUrlChange}
      />
      {validationError && embedUrl && (
        <div className="text-xs text-red-500 mt-1">{validationError}</div>
      )}
      {isDuplicate && (
        <div className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded">
          Warning: This video is already used elsewhere in this page. Using the same video multiple
          times may cause playback conflicts. Consider using a single video with chapter navigation
          instead.
        </div>
      )}

      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={title}
        onChange={handleTitleChange}
      />
    </div>
  );
}

export default BunnyWidget;
