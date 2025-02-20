import { useState, useRef, useEffect } from "react";
import { getCtx } from "@/store/nodes";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import { isStoryFragmentNode } from "@/utils/nodes/type-guards.tsx";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { StoryFragmentMode } from "@/types";
import type { StoryFragmentNode } from "@/types";
import type { ChangeEvent } from "react";

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface StoryFragmentOgPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
}

const StoryFragmentOgPanel = ({ nodeId, setMode }: StoryFragmentOgPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const thisNode = allNodes.get(nodeId);
  if (!thisNode || !isStoryFragmentNode(thisNode)) return null;
  const storyfragmentNode = thisNode as StoryFragmentNode;

  // Initialize image source from existing socialImagePath
  useEffect(() => {
    setImageSrc(storyfragmentNode.socialImagePath || null);
  }, [storyfragmentNode.socialImagePath]);

  const validateImage = (file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        resolve({
          isValid: false,
          error: "Please upload only JPG or PNG files",
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width !== TARGET_WIDTH || img.height !== TARGET_HEIGHT) {
          resolve({
            isValid: false,
            error: `Image must be exactly ${TARGET_WIDTH}x${TARGET_HEIGHT} pixels. Uploaded image is ${img.width}x${img.height} pixels.`,
          });
        } else {
          resolve({ isValid: true });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({
          isValid: false,
          error: "Failed to load image for validation",
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    if (storyfragmentNode.socialImagePath) {
      setIsProcessing(true);
      try {
        // Delete existing image
        await fetch("/api/fs/deleteOgImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: storyfragmentNode.socialImagePath,
          }),
        });

        const updatedNode = cloneDeep({
          ...storyfragmentNode,
          socialImagePath: null,
          isChanged: true,
        });
        ctx.modifyNodes([updatedNode]);
        setImageSrc(null);
        setError(null);
      } catch (err) {
        setError("Failed to remove image");
        console.error("Error removing image:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Validate image dimensions and format
      const validation = await validateImage(file);
      if (!validation.isValid) {
        setError(validation.error || "Invalid image");
        setIsProcessing(false);
        return;
      }

      // Delete existing image if present
      if (storyfragmentNode.socialImagePath) {
        await fetch("/api/fs/deleteOgImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: storyfragmentNode.socialImagePath,
          }),
        });
      }

      // Create new filename using node ID and original extension
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
      const response = await fetch("/api/fs/saveOgImage", {
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
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        socialImagePath: savedPath,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
      setImageSrc(savedPath);
    } catch (err) {
      setError("Failed to process image");
      console.error("Error uploading image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Social Share Image</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-sm text-mydarkgrey mb-2">
              Upload an image (required size: {TARGET_WIDTH}x{TARGET_HEIGHT}px)
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
                      disabled={isProcessing}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey disabled:opacity-50"
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
                  accept="image/jpeg,image/png"
                  className="hidden"
                />

                {imageSrc && <p className="mt-2 text-xs text-mydarkgrey break-all">{imageSrc}</p>}

                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </div>

          <div className="text-sm text-mydarkgrey space-y-2">
            <p>This image will be used when your page is shared on social media.</p>
            <p>Requirements:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                Image must be exactly {TARGET_WIDTH}x{TARGET_HEIGHT} pixels
              </li>
              <li>Only JPG or PNG formats are accepted</li>
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
