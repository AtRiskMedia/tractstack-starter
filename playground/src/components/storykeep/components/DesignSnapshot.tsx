import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import imageCompression from "browser-image-compression";
import PreviewPage from "./PreviewPage";
import type { PageDesign, Theme } from "../../../types";

interface DesignSnapshotProps {
  design: PageDesign;
  theme: Theme;
  brandColors: string[];
  onStart?: () => void;
  onComplete?: (imageData: string) => void;
  forceRegenerate?: boolean;
}

const blobToBase64 = (blob: File) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

export default function DesignSnapshot({
  design,
  theme,
  brandColors,
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

        // Apply brand colors to a contained scope
        const styleSheet = document.createElement("style");
        styleSheet.textContent = brandColors
          .map((color, i) => `--brand-${i + 1}: ${color};`)
          .join("\n");
        document.head.appendChild(styleSheet);

        // Let component render with styles
        await new Promise((resolve) => setTimeout(resolve, 250));

        if (!contentRef.current) return;

        // Generate initial PNG
        const pngImage = await toPng(contentRef.current, {
          width: 1500,
          height: contentRef.current.offsetHeight,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
          pixelRatio: 1,
          backgroundColor: "#ffffff",
          quality: 1,
          canvasWidth: 1500,
          canvasHeight: contentRef.current.offsetHeight,
        });

        // Convert PNG to WebP
        const img = new Image();
        img.src = pngImage;
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);

        const webpBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
        });

        // Compress WebP
        const compressedFile = await imageCompression(
          new File([webpBlob], "image.webp", { type: "image/webp" }),
          {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          }
        );

        // Convert compressed file to base64
        const compressedBase64 = await blobToBase64(compressedFile);

        if (onComplete && typeof compressedBase64 === "string") {
          onComplete(compressedBase64);
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
      // Cleanup any style elements we might have added
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
      {/* Loading Spinner */}
      {(isGenerating || forceRegenerate) && (
        <div className="absolute inset-0 flex items-center justify-center bg-mylightgrey/10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange mx-auto"></div>
            <p className="mt-2 text-sm text-mydarkgrey">Generating preview...</p>
          </div>
        </div>
      )}

      {/* Hidden Preview Content */}
      <div
        className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          ref={contentRef}
          style={{
            width: "1500px",
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
            transform: "scale(1)",
            transformOrigin: "top left",
            isolation: "isolate",
          }}
        >
          <PreviewPage design={design} viewportKey="desktop" slug="preview" isContext={false} />
        </div>
      </div>
    </>
  );
}
