import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import PreviewPage from "./PreviewPage";
import type { PageDesign, Theme } from "../../../types";

interface DesignSnapshotProps {
  design: PageDesign;
  theme: Theme;
  brandColors: string[];
  onStart?: () => void;
  onComplete?: (imageData: string) => void;
}

export default function DesignSnapshot({
  design,
  theme,
  brandColors,
  onStart,
  onComplete,
}: DesignSnapshotProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!previewRef.current || !contentRef.current || isCapturing || brandColors.length === 0)
      return;

    const capturePreview = async () => {
      try {
        setIsCapturing(true);
        onStart?.();

        // Apply brand colors to the preview container
        const previewRoot = previewRef.current;
        const styleSheet = document.createElement("style");
        styleSheet.textContent = brandColors
          .map((color, i) => `--brand-${i + 1}: ${color};`)
          .join("\n");
        previewRoot?.appendChild(styleSheet);

        // Let component render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!previewRef.current || !contentRef.current) return;

        // Get actual content height
        const contentHeight = contentRef.current.offsetHeight;
        const containerWidth = 500;
        const containerHeight = contentHeight;

        const pngImage = await toPng(previewRef.current, {
          cacheBust: true,
          width: containerWidth,
          height: containerHeight,
          backgroundColor: "#FFFFFF",
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
          },
        });

        if (onComplete) {
          onComplete(pngImage);
        }

        styleSheet.remove();
      } catch (error) {
        console.error("Error capturing preview:", error);
        setIsCapturing(false);
      }
    };

    capturePreview();
  }, [design, theme, brandColors, onComplete, isCapturing, onStart]);

  // Return a fixed size container with isolated CSS scope
  return (
    <div
      ref={previewRef}
      style={{
        width: "1200px",
        height: "900px",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        transform: "scale(0.25)",
        transformOrigin: "top left",
        isolation: "isolate", // Create new stacking context
      }}
    >
      <PreviewPage design={design} viewportKey="desktop" slug="preview" isContext={false} />
    </div>
  );
}
