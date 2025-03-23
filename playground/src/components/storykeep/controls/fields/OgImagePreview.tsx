import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import { getCtx } from "@/store/nodes";
import ColorPickerCombo from "./ColorPickerCombo";
import {
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_ASPECT_RATIO,
  calculateOptimalFontSize,
  adjustFontSizeForHeight,
  TEXT_MARGIN,
} from "@/utils/images/ogImageUtils";
import { cloneDeep } from "@/utils/common/helpers";
import type { StoryFragmentNode, Config } from "@/types";

// Constants for image validation
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface OgImagePreviewProps {
  nodeId: string;
  config: Config;
  onCustomImageUpload?: (path: string) => void;
}

const OgImagePreview = ({ nodeId, config, onCustomImageUpload }: OgImagePreviewProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  // Get OG image parameters from context
  const ogParams = ctx.getOgImageParams(nodeId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number | undefined>(ogParams.fontSize);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with values from context
  const [textColor, setTextColor] = useState(ogParams.textColor);
  const [bgColor, setBgColor] = useState(ogParams.bgColor);

  // Update calculated font size when title changes
  useEffect(() => {
    if (!storyfragmentNode?.title) return;

    const initialSize = calculateOptimalFontSize(storyfragmentNode.title);
    const optimalSize = adjustFontSizeForHeight(storyfragmentNode.title, initialSize);

    setFontSize(optimalSize);

    // Update the context with the calculated font size
    ctx.setOgImageParams(nodeId, { fontSize: optimalSize });
  }, [storyfragmentNode?.title, nodeId]);

  // Validate uploaded images for correct dimensions
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
        if (img.width !== OG_IMAGE_WIDTH || img.height !== OG_IMAGE_HEIGHT) {
          resolve({
            isValid: false,
            error: `Image must be exactly ${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT} pixels. Uploaded image is ${img.width}x${img.height} pixels.`,
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

  // Handler for uploading custom images
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      // Validate image dimensions and format
      const validation = await validateImage(file);
      if (!validation.isValid) {
        setImageError(validation.error || "Invalid image");
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

      // Update story fragment node with new social image path
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        socialImagePath: savedPath,
        isChanged: true,
      });

      ctx.modifyNodes([updatedNode]);

      // Call the callback if provided
      if (onCustomImageUpload) {
        onCustomImageUpload(savedPath);
      }
    } catch (err) {
      setImageError("Failed to process image");
      console.error("Error uploading image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for removing custom image
  const handleRemoveImage = async () => {
    if (!storyfragmentNode.socialImagePath) return;

    setIsProcessing(true);
    try {
      await fetch("/api/fs/deleteOgImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: storyfragmentNode.socialImagePath,
        }),
      });

      // Update story fragment node
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        socialImagePath: null,
        isChanged: true,
      });

      ctx.modifyNodes([updatedNode]);
    } catch (error) {
      console.error("Error removing image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for text color changes
  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    ctx.setOgImageParams(nodeId, { textColor: color });

    // Mark story fragment as changed
    const updatedNode = cloneDeep({
      ...storyfragmentNode,
      isChanged: true,
    });
    ctx.modifyNodes([updatedNode]);
  };

  // Handler for background color changes
  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    ctx.setOgImageParams(nodeId, { bgColor: color });

    // Mark story fragment as changed
    const updatedNode = cloneDeep({
      ...storyfragmentNode,
      isChanged: true,
    });
    ctx.modifyNodes([updatedNode]);
  };

  // Calculate preview dimensions (scaled down from 1200x630)
  const previewWidth = 480; // 40% of original
  const previewHeight = previewWidth / OG_ASPECT_RATIO;

  // Calculate scaled font size for preview
  const scaledFontSize = fontSize ? (fontSize * previewWidth) / OG_IMAGE_WIDTH : 24;

  return (
    <div className="space-y-6 w-full">
      <div className="w-full flex flex-col space-y-4">
        <div
          className="relative border border-gray-300 rounded-md overflow-hidden"
          style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
          }}
        >
          {/* If there's a custom image, show it */}
          {storyfragmentNode.socialImagePath ? (
            <>
              <img
                src={storyfragmentNode.socialImagePath}
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
            // Otherwise show the generated preview
            <div
              className="flex items-center justify-center w-full h-full"
              style={{ backgroundColor: bgColor }}
            >
              <div
                className="text-center px-8"
                style={{
                  color: textColor,
                  fontSize: `${scaledFontSize}px`,
                  fontWeight: "bold",
                  lineHeight: 1.2,
                  maxWidth: `${previewWidth - ((TEXT_MARGIN * previewWidth) / OG_IMAGE_WIDTH) * 2}px`,
                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                {storyfragmentNode.title || "Your page title will appear here"}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full max-w-md">
          <div className="flex justify-between items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center text-sm text-myblue hover:text-myorange disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
              {isProcessing
                ? "Processing..."
                : storyfragmentNode.socialImagePath
                  ? "Replace Image"
                  : "Upload Custom Image"}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />

            {storyfragmentNode.socialImagePath && (
              <button
                onClick={handleRemoveImage}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove image
              </button>
            )}
          </div>

          {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}

          <p className="mt-2 text-xs text-gray-500">
            Images must be exactly {OG_IMAGE_WIDTH}x{OG_IMAGE_HEIGHT} pixels (JPG or PNG)
          </p>
        </div>
      </div>

      {!storyfragmentNode.socialImagePath && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md">
          <ColorPickerCombo
            title="Text Color"
            defaultColor={textColor}
            onColorChange={handleTextColorChange}
            config={config}
          />

          <ColorPickerCombo
            title="Background Color"
            defaultColor={bgColor}
            onColorChange={handleBgColorChange}
            config={config}
          />
        </div>
      )}

      <div className="text-sm text-gray-600 mt-2">
        <p>The Open Graph image will be shown when your page is shared on social media.</p>
        {!storyfragmentNode.socialImagePath && (
          <p className="mt-1">
            If no custom image is provided, an image will be generated using your page title and
            these colors.
          </p>
        )}
      </div>
    </div>
  );
};

export default OgImagePreview;
