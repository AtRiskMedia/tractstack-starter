import { useState, useEffect } from "react";
import { classNames, formatDateForUrl } from "../../../utils/common/helpers";
import { reconcileData, resetUnsavedChanges } from "../../../utils/data/reconcileData";
import { getTailwindWhitelist } from "../../../utils/data/tursoTailwindWhitelist";
import type {
  ReconciledData,
  StoryFragmentDatum,
  ContextPaneDatum,
  FileDatum,
  StoryFragmentQueries,
  ContextPaneQueries,
  TursoQuery,
} from "../../../types";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";

type SaveStage =
  | "RECONCILING"
  | "PROCESSING_DESKTOP_IMAGES"
  | "PROCESSING_TABLET_IMAGES"
  | "PROCESSING_MOBILE_IMAGES"
  | "UPDATING_STYLES"
  | "UPLOADING_IMAGES"
  | "PUBLISHING"
  | "COMPLETED"
  | "ERROR";

interface ImageProcessingProgress {
  desktop: number;
  tablet: number;
  mobile: number;
  total: number;
  current: number;
}

type SaveProcessModalProps = {
  id: string;
  isContext: boolean;
  originalData: StoryFragmentDatum | ContextPaneDatum | null;
  onClose: (slug: string) => void;
  firstPage: boolean;
};

export const SaveProcessModal = ({
  id,
  isContext,
  originalData,
  onClose,
  firstPage,
}: SaveProcessModalProps) => {
  const [stage, setStage] = useState<SaveStage>("RECONCILING");
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [progress, setProgress] = useState<ImageProcessingProgress>({
    desktop: 0,
    tablet: 0,
    mobile: 0,
    total: 0,
    current: 0,
  });

  const resizeImage = async (base64: string, targetWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        const scaleFactor = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scaleFactor;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64;
    });
  };

  const processImages = async (
    files: FileDatum[],
    size: number,
    stage: "PROCESSING_DESKTOP_IMAGES" | "PROCESSING_TABLET_IMAGES" | "PROCESSING_MOBILE_IMAGES"
  ): Promise<{ filename: string; data: string }[]> => {
    // For desktop size (1920px), use the existing processed images
    if (size === 1920) {
      setStage(stage);
      const results = files
        .filter((f) => f.src.startsWith("data:image") && !f.filename.endsWith(".svg"))
        .map((file) => ({
          filename: file.filename.replace(/\.(\w+)$/, `_${size}px.$1`),
          data: file.src,
        }));
      setProgress((prev) => ({
        ...prev,
        desktop: 100,
        total: results.length,
        current: results.length,
      }));
      return results;
    }

    const results = [];
    const imageFiles = files.filter(
      (f) => f.src.startsWith("data:image") && !f.filename.endsWith(".svg")
    );

    setProgress((prev) => ({ ...prev, total: imageFiles.length }));
    setStage(stage);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const resized = await resizeImage(file.src, size);
      const sizeFilename = file.filename.replace(/\.(\w+)$/, `_${size}px.$1`);

      results.push({ filename: sizeFilename, data: resized });

      setProgress((prev) => ({
        ...prev,
        [stage === "PROCESSING_TABLET_IMAGES" ? "tablet" : "mobile"]:
          ((i + 1) / imageFiles.length) * 100,
        current: i + 1,
      }));
    }

    return results;
  };

  const uploadFiles = async (files: FileDatum[]): Promise<boolean> => {
    try {
      const monthPath = formatDateForUrl(new Date());

      // Handle SVGs first
      const svgFiles = files.filter((f) => f.filename.endsWith(".svg"));
      for (const file of svgFiles) {
        await fetch("/api/fs/saveImage", {
          method: "POST",
          body: JSON.stringify({
            path: `images/${monthPath}`,
            filename: file.filename,
            data: file.src,
          }),
        });
      }

      // Process images at different sizes
      const desktopImages = await processImages(files, 1920, "PROCESSING_DESKTOP_IMAGES");
      const tabletImages = await processImages(files, 1080, "PROCESSING_TABLET_IMAGES");
      const mobileImages = await processImages(files, 600, "PROCESSING_MOBILE_IMAGES");

      // Upload all processed images
      setStage("UPLOADING_IMAGES");
      const allImages = [...desktopImages, ...tabletImages, ...mobileImages];
      for (const { filename, data } of allImages) {
        await fetch("/api/fs/saveImage", {
          method: "POST",
          body: JSON.stringify({
            path: `images/${monthPath}`,
            filename,
            data,
          }),
        });
      }

      return true;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  useEffect(() => {
    const runSaveProcess = async () => {
      try {
        const data = reconcileData(id, isContext, originalData);
        const slug = !isContext ? data?.storyFragment?.data?.slug : data?.contextPane?.data?.slug;
        setSlug(slug ?? ``);
        const hasFiles = !isContext
          ? data?.storyFragment?.data?.panesPayload
          : [data?.contextPane?.data?.panePayload];
        const files = hasFiles
          ?.map((p) => {
            if (p?.files.length) {
              return p.files
                .map((f) => {
                  if (f.src.startsWith(`data:image`))
                    return {
                      filename: f.filename,
                      altDescription: f.altDescription,
                      src: f.src,
                      paneId: f.paneId,
                      markdown: f.markdown,
                    };
                  return null;
                })
                .filter((n) => n);
            }
            return null;
          })
          .filter((n) => n)
          .flat() as FileDatum[];

        setStage("UPDATING_STYLES");
        await updateCustomStyles(data);

        if (files && files.length) {
          await uploadFiles(files);
        }

        setStage("PUBLISHING");
        await publishChanges(data);
        setStage("COMPLETED");
        resetUnsavedChanges(id, isContext);
      } catch (err) {
        setStage("ERROR");
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      }
    };

    runSaveProcess();
  }, [id, isContext]);

  const generateTailwindWhitedlistStyles = async (
    newWhitelistItems: string[],
    existingClasses: string[]
  ) => {
    try {
      // Fetch tailwind config
      const tailwindConfigResponse = await fetch("/api/fs/tailwindConfig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!tailwindConfigResponse.ok) {
        throw new Error(`Failed to fetch tailwind config: ${tailwindConfigResponse.statusText}`);
      }

      // Fetch storykeep whitelist
      const storykeepWhitelist = await fetch("/api/fs/storykeepWhitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!storykeepWhitelist.ok) {
        throw new Error(`Failed to fetch storykeep whitelist: ${storykeepWhitelist.statusText}`);
      }

      // Parse the tailwind config and storykeep whitelist JSON data
      const tailwindConfigJson = await tailwindConfigResponse.json();
      const tailwindConfig = { theme: JSON.parse(tailwindConfigJson?.data || "{}") };
      const storykeepWhitelistJson = await storykeepWhitelist.json();
      const storykeepWhitelistArr = storykeepWhitelistJson?.data || [];

      // Create the whitelist
      const fullWhitelist = [
        ...new Set([...newWhitelistItems, ...existingClasses, ...storykeepWhitelistArr]),
      ];

      // Generate Tailwind CSS styles
      const tailwindCss = createTailwindcss({ tailwindConfig });
      const frontendHtmlContent = [`<span class="${fullWhitelist.join(" ")}"></span>`];
      const frontendCss = await tailwindCss.generateStylesFromContent(
        `
      @tailwind base;
      @tailwind utilities;
    `,
        frontendHtmlContent
      );

      // Generate app CSS styles
      const appHtmlContent = [`<span class="${storykeepWhitelistArr.join(" ")}"></span>`];
      const appCss = await tailwindCss.generateStylesFromContent(
        `
      @tailwind base;
      @tailwind utilities;
    `,
        appHtmlContent
      );

      // Write to the API endpoint
      await fetch("/api/fs/writeAppWhitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frontendCss: frontendCss,
          appCss: appCss,
        }),
      });
    } catch (error) {
      console.error("Error generating Tailwind styles:", error);
    }
  };

  const updateCustomStyles = async (payload: ReconciledData): Promise<boolean> => {
    try {
      const panes =
        !isContext && payload?.storyFragment?.data?.panesPayload
          ? payload.storyFragment.data.panesPayload
          : payload?.contextPane?.data?.panePayload
            ? [payload.contextPane.data.panePayload].map((p) => ({
                options_payload: p.optionsPayload,
              }))
            : [];
      const newWhitelistItems = getTailwindWhitelist(panes);
      // Get existing classes from database
      const existing = await fetch("/api/turso/uniqueTailwindClasses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id),
      });
      if (!existing.ok) {
        throw new Error("Failed to fetch existing Tailwind classes");
      }
      const result2 = await existing.json();
      const existingClasses = result2.data || [];

      // Merge all classes without duplicates
      //const newWhitelist = [...new Set([...newWhitelistItems, ...existingClasses])];
      //const response = await fetch("/api/fs/generateTailwindWhitelist", {
      //  method: "POST",
      //  headers: {
      //    "Content-Type": "application/json",
      //  },
      //  body: JSON.stringify({
      //    whitelist: newWhitelist,
      //  }),
      //});
      //if (!response.ok) {
      //  throw new Error(`Failed to update styles: ${response.statusText}`);
      //}
      //const result = await response.json();

      await generateTailwindWhitedlistStyles(newWhitelistItems, existingClasses);

      //if (firstPage) console.log(`INIT now`);
      //if (result.success)
      await fetch("/api/fs/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: "init",
          updates: {
            STYLES_VER: Date.now(),
            ...(firstPage
              ? {
                  HOME_SLUG: `hello`,
                  SITE_INIT: true,
                }
              : {}),
          },
        }),
      });
      //return result.success;
      return true
    } catch (err) {
      setStage("ERROR");
      setError(
        err instanceof Error ? err.message : "An error occurred while publishing tailwind whitelist"
      );
      throw err;
    }
  };

  const publishChanges = async (data: ReconciledData) => {
    const queries = isContext ? data.contextPane?.queries : data.storyFragment?.queries;
    if (!queries) {
      return;
    }

    try {
      // Define the order of execution
      const executionOrder: (keyof StoryFragmentQueries | keyof ContextPaneQueries)[] = [
        "storyfragment",
        "markdowns",
        "panes",
        "pane",
        "files",
        "storyfragment_pane",
        "file_pane",
        "file_markdown",
      ];

      // Collect all valid queries in order
      const queriesInOrder = executionOrder.reduce((acc: TursoQuery[], queryType) => {
        if (queryType in queries) {
          const typeQueries = queries[queryType as keyof typeof queries];
          const queryArray = Array.isArray(typeQueries) ? typeQueries : [typeQueries];
          acc.push(...queryArray.filter((q) => q && q.sql));
        }
        return acc;
      }, []);

      // Execute the queries using the new API endpoint
      const response = await fetch("/api/turso/executeQueries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queriesInOrder),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute queries: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to execute queries");
      }
    } catch (err) {
      setStage("ERROR");
      setError(err instanceof Error ? err.message : "An error occurred while publishing changes");
      throw err;
    }
  };

  const getStageDescription = (currentStage: SaveStage) => {
    switch (currentStage) {
      case "RECONCILING":
        return "Reconciling data changes...";
      case "PROCESSING_DESKTOP_IMAGES":
        return `Processing desktop images (${progress.current}/${progress.total})...`;
      case "PROCESSING_TABLET_IMAGES":
        return `Processing tablet images (${progress.current}/${progress.total})...`;
      case "PROCESSING_MOBILE_IMAGES":
        return `Processing mobile images (${progress.current}/${progress.total})...`;
      case "UPDATING_STYLES":
        return "Updating custom styles...";
      case "UPLOADING_IMAGES":
        return "Uploading processed images...";
      case "PUBLISHING":
        return "Publishing changes...";
      case "COMPLETED":
        return "Save completed successfully!";
      case "ERROR":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  const getProgressPercentage = () => {
    switch (stage) {
      case "RECONCILING":
        return 10;
      case "PROCESSING_DESKTOP_IMAGES":
        return 20 + progress.desktop * 0.2;
      case "PROCESSING_TABLET_IMAGES":
        return 40 + progress.tablet * 0.2;
      case "PROCESSING_MOBILE_IMAGES":
        return 60 + progress.mobile * 0.2;
      case "UPLOADING_IMAGES":
        return 80;
      case "PUBLISHING":
        return 90;
      case "COMPLETED":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 z-[10101] bg-mydarkgrey bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Saving Changes</h2>
        <div className="mb-4">
          <div className="h-2 bg-mylightgrey rounded-full">
            <div
              className={classNames(
                "h-full rounded-full transition-all duration-500",
                stage === "COMPLETED" ? "bg-green-500" : "bg-blue-500",
                stage === "ERROR" ? "bg-red-500" : ""
              )}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
        <p className="text-lg mb-4">{getStageDescription(stage)}</p>
        {stage === "COMPLETED" && (
          <button
            onClick={() => onClose(slug)}
            className="bg-mygreen text-black px-4 py-2 rounded hover:bg-myorange"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
