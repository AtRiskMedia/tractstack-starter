import { useState, useEffect } from "react";
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
import type { Config } from "@/types";

interface OgImagePreviewProps {
  nodeId: string;
  title: string;
  socialImagePath: string | null;
  config: Config;
  onColorChange?: (textColor: string, bgColor: string) => void; // Added for color change notification
}

const OgImagePreview = ({
  nodeId,
  title,
  socialImagePath,
  config,
  onColorChange,
}: OgImagePreviewProps) => {
  const ctx = getCtx();
  const ogParams = ctx.getOgImageParams(nodeId);
  const [fontSize, setFontSize] = useState<number | undefined>(ogParams.fontSize);
  const [textColor, setTextColor] = useState(ogParams.textColor);
  const [bgColor, setBgColor] = useState(ogParams.bgColor);

  useEffect(() => {
    if (!title) return;
    const initialSize = calculateOptimalFontSize(title);
    const optimalSize = adjustFontSizeForHeight(title, initialSize);
    setFontSize(optimalSize);
    ctx.setOgImageParams(nodeId, { fontSize: optimalSize });
  }, [title, nodeId]);

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    ctx.setOgImageParams(nodeId, { textColor: color });
    onColorChange?.(color, bgColor); // Notify parent
  };

  const handleBgColorChange = (color: string) => {
    setBgColor(color);
    ctx.setOgImageParams(nodeId, { bgColor: color });
    onColorChange?.(textColor, color); // Notify parent
  };

  const previewWidth = 480;
  const previewHeight = previewWidth / OG_ASPECT_RATIO;
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
          {socialImagePath ? (
            <img
              src={socialImagePath}
              alt="Open Graph preview"
              className="w-full h-full object-cover"
            />
          ) : (
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
                {title || "Your page title will appear here"}
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Images must be exactly {OG_IMAGE_WIDTH}x{OG_IMAGE_HEIGHT} pixels (JPG or PNG)
        </p>
      </div>

      {!socialImagePath && (
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
        {!socialImagePath && (
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
