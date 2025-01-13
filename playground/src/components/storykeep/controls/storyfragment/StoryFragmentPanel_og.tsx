import { useState, useRef } from "react";
import { getCtx } from "@/store/nodes";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import { isStoryFragmentNode } from "@/utils/nodes/type-guards.tsx";
import type { StoryFragmentModeType, StoryFragmentNode } from "@/types";
import type { ChangeEvent } from "react";

const TARGET_WIDTH = 1200; // Standard OG image width
const TARGET_HEIGHT = 630; // Standard OG image height

interface StoryFragmentOgPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentModeType) => void;
}

const StoryFragmentOgPanel = ({ nodeId, setMode }: StoryFragmentOgPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const thisNode = allNodes.get(nodeId);
  if (!thisNode || !isStoryFragmentNode(thisNode)) return null;
  const storyfragmentNode = thisNode as StoryFragmentNode;

  // Initialize image source from existing socialImagePath
  useState(() => {
    setImageSrc(storyfragmentNode.socialImagePath || null);
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    if (storyfragmentNode.socialImagePath) {
      // Delete existing image
      await fetch("/api/fs/deleteImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: storyfragmentNode.socialImagePath,
        }),
      });
    }

    const updatedNode = {
      ...storyfragmentNode,
      socialImagePath: null,
      isChanged: true,
    };

    const newNodes = new Map(allNodes);
    newNodes.set(nodeId, updatedNode);
    ctx.allNodes.set(newNodes);
    ctx.notifyNode(nodeId);
    setImageSrc(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Delete existing image if present
      if (storyfragmentNode.socialImagePath) {
        await fetch("/api/fs/deleteImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: storyfragmentNode.socialImagePath,
          }),
        });
      }

      // Create new filename using node ID
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${nodeId}.${fileExtension}`;
      const imageDir = "/images/og";

      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Upload to filesystem
      const response = await fetch("/api/fs/saveImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: imageDir,
          filename,
          data: base64,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { path: savedPath } = await response.json();

      // Update store with new image path
      const updatedNode = {
        ...storyfragmentNode,
        socialImagePath: savedPath,
        isChanged: true,
      };

      const newNodes = new Map(allNodes);
      newNodes.set(nodeId, updatedNode);
      ctx.allNodes.set(newNodes);
      ctx.notifyNode(nodeId);

      // Update UI
      setImageSrc(savedPath);
    } catch (error) {
      console.error("Error uploading image:", error);
      // Could add error state handling here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Social Share Image</h3>
          <button onClick={() => setMode("DEFAULT")} className="text-myblue hover:text-black">
            ← Go Back
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-sm text-mydarkgrey mb-2">
              Upload an image (recommended size: {TARGET_WIDTH}x{TARGET_HEIGHT}px)
            </span>

            <div className="flex items-center space-x-4">
              <div className="relative w-64 aspect-[1.91/1] bg-mylightgrey/5 rounded-md overflow-hidden">
                {imageSrc ? (
                  <>
                    <img
                      src={imageSrc}
                      alt="Open Graph preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey"
                    >
                      <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full border-2 border-dashed border-mydarkgrey/30 rounded-md">
                    <span className="text-sm text-mydarkgrey">No image selected</span>
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <button
                  onClick={handleUploadClick}
                  disabled={isProcessing}
                  className="flex items-center text-sm text-myblue hover:text-myorange disabled:opacity-50"
                >
                  <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                  {isProcessing ? "Processing..." : imageSrc ? "Change Image" : "Upload Image"}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {imageSrc && <p className="mt-2 text-xs text-mydarkgrey break-all">{imageSrc}</p>}
              </div>
            </div>
          </div>

          <div className="text-sm text-mydarkgrey space-y-2">
            <p>This image will be used when your page is shared on social media.</p>
            <p>For best results:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Use an aspect ratio of 1.91:1</li>
              <li>Keep important content centered</li>
              <li>Use clear, high-contrast imagery</li>
              <li>Avoid small text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentOgPanel;
