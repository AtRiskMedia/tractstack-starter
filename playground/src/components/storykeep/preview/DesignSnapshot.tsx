import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import PreviewPage from "./PreviewPage";
import type { PageDesign, Theme, Config } from "../../../types";
import { blobToBase64 } from "@/utils/helpers.ts";

interface DesignSnapshotProps {
  design: PageDesign;
  theme: Theme;
  brandColors: string[];
  config: Config;
  onStart?: () => void;
  onComplete?: (imageData: string) => void;
  forceRegenerate?: boolean;
}

const WIDTH = 500;

export default function DesignSnapshot({
  design,
  theme,
  brandColors,
  config,
  onStart,
  onComplete,
  forceRegenerate,
}: DesignSnapshotProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || !brandColors.length) return;
    if (!isGenerating && !forceRegenerate) return;

    const generateSnapshot = async () => {
      try {
        onStart?.();

        const styleSheet = document.createElement("style");
        styleSheet.textContent = brandColors
          .map((color, i) => `--brand-${i + 1}: ${color};`)
          .join("\n");
        document.head.appendChild(styleSheet);

        await new Promise((resolve) => setTimeout(resolve, 250));

        if (!contentRef.current) return;

        // Take screenshot at WIDTHpx while maintaining aspect ratio
        const scale = WIDTH / 1500;
        const scaledHeight = contentRef.current.offsetHeight * scale;

        const pngImage = await toPng(contentRef.current, {
          width: WIDTH,
          height: scaledHeight,
          style: {
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          },
          pixelRatio: 1,
          backgroundColor: "#ffffff",
          quality: 1,
          canvasWidth: WIDTH,
          canvasHeight: scaledHeight,
        });

        const webpBlob = await new Promise<Blob>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = WIDTH;
            canvas.height = scaledHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
          };
          img.src = pngImage;
        });

        const base64 = await blobToBase64(webpBlob);

        if (onComplete && typeof base64 === "string") {
          onComplete(base64);
        }

        styleSheet.remove();
      } catch (error) {
        console.error("Error generating snapshot:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();

    return () => {
      const styles = document.querySelectorAll("style");
      styles.forEach((style) => {
        if (style.textContent?.includes("--brand-")) {
          style.remove();
        }
      });
    };
  }, [design, theme, brandColors, onComplete, onStart, isGenerating, forceRegenerate]);

  return (
    <>
      {(isGenerating || forceRegenerate) && (
        <div className="absolute inset-0 flex items-center justify-center bg-mylightgrey/10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange mx-auto"></div>
            <p className="mt-2 text-sm text-mydarkgrey">Generating preview...</p>
          </div>
        </div>
      )}

      <div
        className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          ref={contentRef}
          className="w-[1500px]"
          style={{
            backgroundColor: "#FFFFFF",
            isolation: "isolate",
          }}
        >
          <PreviewPage
            design={design}
            viewportKey="desktop"
            slug="preview"
            isContext={false}
            config={config}
          />
        </div>
      </div>
    </>
  );
}
