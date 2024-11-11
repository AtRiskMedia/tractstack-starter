import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { classNames } from "../../../utils/helpers";
import { paneDesigns } from "../../../assets/paneDesigns";
import PreviewPage from "./PreviewPage";
import { toPng } from "html-to-image";
import imageCompression from "browser-image-compression";
import type { Variant, Theme } from "../../../types";

interface DesignSnapshotModalProps {
  onClose: () => void;
}

const themes: Theme[] = ["light", "light-bw", "light-bold", "dark", "dark-bw", "dark-bold"];

const getScaledProgress = (current: number, total: number) =>
  total === 0 ? 1 : (Math.floor((current / total) * 11 + 1) % 12) + 1;

function base64toBlob(b64Data: string, contentType: string = "", sliceSize: number = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}

function blobToBase64(blob: File) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function compressBase64Image(base64String: string) {
  const blob = base64toBlob(base64String.split(",")[1], "image/webp");
  const file = new File([blob], "image.png", { type: "image/webp" });
  const compressedFile = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  const compressedBase64 = (await blobToBase64(compressedFile)) as string;
  return compressedBase64;
}

async function saveFile(src: string, filename: string): Promise<boolean> {
  const files = [{ filename, src }];
  const response = await fetch(`/api/concierge/storykeep/paneDesignImage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files,
    }),
  });
  const data = await response.json();
  if (data.success) return true;
  return false;
}

export const DesignSnapshotModal = ({ onClose }: DesignSnapshotModalProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [currentDesign, setCurrentDesign] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(0);
  const [currentVariant, setCurrentVariant] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState(``);
  const [isCompleted, setIsCompleted] = useState(false);

  // Get base designs and their valid variants
  const designConfigs = useMemo(() => {
    const baseDesigns = paneDesigns("light", "default");
    const flattenedConfigs = baseDesigns.flatMap((design) => {
      const variants = design.variants || ["default"];
      return variants.map((variant) => {
        return {
          design,
          validVariants: [variant],
        };
      });
    });
    const total = flattenedConfigs.length * themes.length;
    setProgress({ current: 0, total });
    return flattenedConfigs;
  }, []);

  const getCurrentDesign = () => {
    const currentConfig = designConfigs[currentDesign];
    if (!currentConfig) return null;

    const theme = themes[currentTheme];
    const variant = currentConfig.validVariants[0]; // We know it's an array of 1 now

    // Get designs for this theme and variant
    const designs = paneDesigns(theme, variant as Variant);

    // Find matching design, handling variant substitution in id
    const design = designs.find((d) => {
      // Replace the '-default' suffix with the variant
      const expectedId = currentConfig.design.id.replace("-default", `-${variant}`);
      return d.id === expectedId;
    });
    if (!design) {
      console.error("Failed to find design:", {
        baseId: currentConfig.design.id,
        expectedId: currentConfig.design.id.replace("-default", `-${variant}`),
        theme,
        variant,
        availableIds: designs.map((d) => d.id),
      });
    }
    return design;
  };

  const moveToNext = useCallback(() => {
    if (progress.total && progress.current === progress.total - 1) {
      setStatusMsg(`COMPLETED!`);
      setIsCompleted(true);
    } else setProgress((prev) => ({ ...prev, current: prev.current + 1 }));

    const currentConfig = designConfigs[currentDesign];
    if (!currentConfig) {
      setIsGenerating(false);
      return;
    }

    if (currentVariant < currentConfig.validVariants.length - 1) {
      setCurrentVariant((prev) => prev + 1);
    } else if (currentTheme < themes.length - 1) {
      setCurrentVariant(0);
      setCurrentTheme((prev) => prev + 1);
    } else if (currentDesign < designConfigs.length - 1) {
      setCurrentVariant(0);
      setCurrentTheme(0);
      setCurrentDesign((prev) => prev + 1);
    } else {
      setIsGenerating(false);
    }
  }, [currentDesign, currentTheme, currentVariant, designConfigs]);

  const generateImage = async () => {
    if (!previewRef.current) return;

    try {
      const design = getCurrentDesign();
      if (!design) {
        moveToNext();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      // First get PNG data
      const pngImage = await toPng(previewRef.current, {
        width: 1500,
        height: previewRef.current.offsetHeight,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        quality: 1,
        canvasWidth: 1500,
        canvasHeight: previewRef.current.offsetHeight,
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

      const webpData = canvas.toDataURL("image/webp", 0.8);
      const src = await compressBase64Image(webpData);
      const filename = `${design.id}-${themes[currentTheme]}.webp`;
      const result = await saveFile(src, filename);
      if (!result) setStatusMsg(`Error generating file`);

      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      setStatusMsg(`Error generating image: ${error}`);
    }

    if (!statusMsg && !isCompleted) moveToNext();
  };

  useEffect(() => {
    if (isGenerating && !isCompleted) {
      generateImage();
    } else {
      setCurrentDesign(0);
      setCurrentTheme(0);
      setCurrentVariant(0);
      setProgress((prev) => ({ ...prev, current: 0 }));
      setIsGenerating(true);
    }
  }, [currentDesign, currentTheme, currentVariant, isGenerating]);

  // whitelist w-1/12 w-2/12 w-3/12 w-4/12 w-5/12 w-6/12 w-7/12 w-8/12 w-9/12 w-10/12 w-11/12 w-12/12
  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-3xl w-full">
          <h2 className="text-2xl font-bold mb-4">Generating Design Snapshots</h2>
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className={classNames(
                  "h-full rounded-full transition-all",
                  !isCompleted
                    ? `w-${getScaledProgress(progress.current ?? 0, progress.total ?? 1)}/12 bg-myorange`
                    : `w-full bg-mygreen`
                )}
              />
            </div>
          </div>

          <div className="mb-4 font-mono text-sm whitespace-pre-wrap h-32 overflow-auto bg-gray-100 p-2 rounded">
            {!statusMsg && !isCompleted ? (
              <div>
                <h2 className="text-lg font-bold mb-2">
                  Currently Rendering: {progress.current} of {progress.total}
                </h2>
                <div className="mb-2">
                  <strong>Design:</strong> {getCurrentDesign()?.id}
                  <br />
                  <strong>Theme:</strong> {themes[currentTheme]}
                  <br />
                  <strong>Variant:</strong>{" "}
                  {designConfigs[currentDesign]?.validVariants[currentVariant]}
                </div>
              </div>
            ) : (
              statusMsg
            )}
          </div>

          {isCompleted && (
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        className="fixed opacity-0 pointer-events-none"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "1500px",
          height: "auto",
          overflow: "hidden",
        }}
      >
        {isGenerating && !isCompleted && getCurrentDesign() && (
          <div
            ref={previewRef}
            className="w-[1500px]"
            style={{
              isolation: "isolate",
              contain: "layout paint",
            }}
          >
            <PreviewPage
              design={{
                name: getCurrentDesign()?.name || "",
                isContext: false,
                tailwindBgColour: null,
                paneDesignsMap: [],
                paneDesigns: [getCurrentDesign()!],
              }}
              viewportKey="desktop"
              slug="preview"
              isContext={false}
            />
          </div>
        )}
      </div>
    </>
  );
};
