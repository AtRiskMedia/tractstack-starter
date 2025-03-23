import { useState, useEffect, useRef } from "react";
import { getCtx } from "@/store/nodes";
import { classNames } from "@/utils/common/helpers";
import { NodesSerializer_Json } from "@/store/nodesSerializer_Json";
import { generateOgImageWithFontLoading } from "@/utils/images/ogImageGenerator";
import type { SaveData } from "@/store/nodesSerializer";
import type { StoryFragmentNode } from "@/types";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";

type SaveStage =
  | "PREPARING"
  | "SAVING_MENUS"
  | "SAVING_FILES"
  | "SAVING_PANES"
  | "SAVING_STORY_FRAGMENTS"
  | "PROCESSING_STYLES"
  | "COMPLETED"
  | "ERROR";

interface SaveProgress {
  currentItem: number;
  totalItems: number;
}

interface SaveModalProps {
  nodeId: string;
  onClose: () => void;
  onSaveComplete?: () => void;
}

const SaveModal = ({ nodeId, onClose, onSaveComplete }: SaveModalProps) => {
  const [stage, setStage] = useState<SaveStage>("PREPARING");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [itemProgress, setItemProgress] = useState<SaveProgress>({
    currentItem: 0,
    totalItems: 0,
  });
  const isSaving = useRef(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [debugImage, setDebugImage] = useState<string | null>(null);

  const addDebugMessage = (message: string) => {
    setDebugMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Add event listener to disable scrolling when modal is open
  useEffect(() => {
    // Store original overflow setting
    const originalOverflow = document.body.style.overflow;
    // Prevent scrolling while modal is open
    document.body.style.overflow = "hidden";

    // Handler to prevent all keyboard shortcuts
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Allow only tab navigation within the modal
      if (e.key !== "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }

      // Only allow Escape key to close the modal if save is completed or errored
      if (e.key === "Escape" && (stage === "COMPLETED" || stage === "ERROR")) {
        onClose();
      }
    };

    // Prevent all keyboard shortcuts
    window.addEventListener("keydown", preventKeyboardShortcuts, true);

    return () => {
      // Restore original overflow setting
      document.body.style.overflow = originalOverflow;
      // Remove keyboard event listener
      window.removeEventListener("keydown", preventKeyboardShortcuts, true);
    };
  }, [onClose, stage]);

  useEffect(() => {
    const saveChanges = async () => {
      if (isSaving.current) return;
      isSaving.current = true;
      addDebugMessage("Starting save process");

      const ctx = getCtx();
      const serializer = new NodesSerializer_Json();

      try {
        // Process nodes through serializer first
        addDebugMessage("Serializing nodes...");
        const saveResult = serializer.save(ctx);
        if (!saveResult) {
          console.log("No changes to save");
          addDebugMessage("No changes detected to save");
          setStage("COMPLETED");
          return;
        }

        // Convert boolean result to SaveData
        const saveData = saveResult as unknown as SaveData;
        addDebugMessage(
          `Found data to save: Menus:${saveData.menus?.length}, Files:${saveData.files?.length}, Panes:${saveData.panes?.length}, Fragments:${saveData.storyfragments?.length}`
        );

        // Save Menu nodes
        if (saveData.menus?.length > 0) {
          setStage("SAVING_MENUS");
          setProgress(10);
          setItemProgress({ currentItem: 0, totalItems: saveData.menus.length });
          addDebugMessage(`Saving ${saveData.menus.length} menus`);

          for (let i = 0; i < saveData.menus.length; i++) {
            addDebugMessage(
              `Saving menu ${i + 1}/${saveData.menus.length}: ${saveData.menus[i].id}`
            );
            const response = await fetch("/api/turso/upsertMenu", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saveData.menus[i]),
            });

            if (!response.ok) {
              throw new Error("Failed to save menu");
            }
            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        // Save File nodes
        if (saveData.files?.length > 0) {
          setStage("SAVING_FILES");
          setProgress(20);
          setItemProgress({ currentItem: 0, totalItems: saveData.files.length });
          addDebugMessage(`Saving ${saveData.files.length} files`);

          for (let i = 0; i < saveData.files.length; i++) {
            addDebugMessage(
              `Saving file ${i + 1}/${saveData.files.length}: ${saveData.files[i].id}`
            );
            const response = await fetch("/api/turso/upsertFile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saveData.files[i]),
            });

            if (!response.ok) {
              throw new Error("Failed to save file");
            }
            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        // Save Pane nodes (which include markdown content)
        if (saveData.panes?.length > 0) {
          setStage("SAVING_PANES");
          setProgress(30);
          setItemProgress({ currentItem: 0, totalItems: saveData.panes.length });
          addDebugMessage(`Saving ${saveData.panes.length} panes`);

          for (let i = 0; i < saveData.panes.length; i++) {
            addDebugMessage(
              `Saving pane ${i + 1}/${saveData.panes.length}: ${saveData.panes[i].id}`
            );
            const pane = saveData.panes[i];

            // Extract markdown data from options_payload
            const options = JSON.parse(pane.options_payload);
            const markdownNode = options.nodes?.find((n: any) => n.nodeType === "Markdown");

            const paneData = {
              rowData: {
                id: pane.id,
                title: pane.title,
                slug: pane.slug,
                pane_type: pane.pane_type,
                markdown_id: pane.markdown_id,
                created: pane.created,
                changed: pane.changed,
                is_context_pane: pane.is_context_pane,
                options_payload: pane.options_payload,
              },
              markdownData: markdownNode
                ? {
                    id: markdownNode.id,
                    markdown_body: markdownNode.markdownBody,
                  }
                : undefined,
            };

            const response = await fetch("/api/turso/upsertPane", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paneData),
            });

            if (!response.ok) {
              throw new Error("Failed to save pane");
            }
            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        // Save Story Fragment nodes
        if (saveData.storyfragments?.length > 0) {
          setStage("SAVING_STORY_FRAGMENTS");
          setProgress(50);
          setItemProgress({ currentItem: 0, totalItems: saveData.storyfragments.length });
          addDebugMessage(`Saving ${saveData.storyfragments.length} story fragments`);

          for (let i = 0; i < saveData.storyfragments.length; i++) {
            const fragment = saveData.storyfragments[i];
            addDebugMessage(
              `Processing fragment ${i + 1}/${saveData.storyfragments.length}: ${fragment.id}`
            );

            // Check if socialImagePath is not a string - meaning it will be set to null
            // This is our trigger to generate a new OG image
            if (typeof fragment.social_image_path !== "string") {
              // Ensure it's explicitly null for the database to clear old values
              fragment.social_image_path = null;

              try {
                // Get node to access its OG image parameters
                const allNodes = ctx.allNodes.get();
                const node = allNodes.get(fragment.id) as StoryFragmentNode;

                if (node && fragment.title) {
                  addDebugMessage("Getting OG parameters for generation");
                  // Get OG image parameters from context
                  const params = ctx.getOgImageParams(fragment.id);
                  addDebugMessage(
                    `OG params: text:${params.textColor}, bg:${params.bgColor}, font:${params.fontSize || "auto"}`
                  );

                  // Generate the image
                  addDebugMessage("Generating OG image...");
                  const imageData = await generateOgImageWithFontLoading(fragment.title, params);
                  addDebugMessage("Image generation complete");

                  // For debug visualization
                  setDebugImage(imageData);

                  // Prepare filename with node ID
                  const filename = `${fragment.id}.png`;
                  addDebugMessage(`Saving OG image with filename: ${filename}`);

                  // Save image using existing endpoint
                  const imgResponse = await fetch("/api/fs/saveOgImage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      path: "/images/og",
                      filename,
                      data: imageData,
                    }),
                  });

                  if (imgResponse.ok) {
                    const { path } = await imgResponse.json();
                    addDebugMessage(`OG image saved at: ${path}`);
                  } else {
                    addDebugMessage(`Failed to save OG image: ${imgResponse.status}`);
                  }
                }
              } catch (imgError) {
                addDebugMessage(
                  `Error generating OG image: ${imgError instanceof Error ? imgError.message : String(imgError)}`
                );
                console.error("Error generating OG image:", imgError);
                // Continue with save process even if image generation fails
              }
            }

            addDebugMessage(
              `Saving fragment: ${fragment.id}, socialImagePath: ${fragment.social_image_path}`
            );
            const response = await fetch("/api/turso/upsertStoryFragment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fragment),
            });

            if (!response.ok) {
              throw new Error("Failed to save story fragment");
            }
            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        // Mark all nodes as clean
        addDebugMessage("Cleaning dirty nodes");
        ctx.getDirtyNodes().forEach((node) => {
          if (node.isChanged) {
            ctx.cleanNode(node.id);
          }
        });

        // Process Tailwind styles
        setStage("PROCESSING_STYLES");
        setProgress(80);
        addDebugMessage("Processing styles");

        const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
        // skip in multi-tenant
        if (!isMultiTenant)
          try {
            addDebugMessage("Generating Tailwind styles");
            const response = await fetch("/api/tailwind/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (!response.ok) {
              throw new Error("Failed to generate Tailwind styles");
            }
            addDebugMessage("Tailwind styles generated successfully");
          } catch (styleError) {
            addDebugMessage(
              `Style processing error: ${styleError instanceof Error ? styleError.message : String(styleError)}`
            );
            console.error("Style processing error:", styleError);
            // Continue with save process even if style generation fails
          }

        setProgress(100);
        setStage("COMPLETED");
        addDebugMessage("Save process completed successfully");
        if (onSaveComplete) {
          onSaveComplete();
        }
      } catch (err) {
        setStage("ERROR");
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        addDebugMessage(`Error in save process: ${errorMessage}`);
        console.error("Error saving changes:", err);
      }
    };

    saveChanges();
  }, [nodeId, onSaveComplete]);

  const getStageDescription = (currentStage: SaveStage) => {
    const getProgressText = () => {
      if (itemProgress.totalItems === 0) return "";
      return ` (${itemProgress.currentItem}/${itemProgress.totalItems})`;
    };

    switch (currentStage) {
      case "PREPARING":
        return "Preparing changes...";
      case "PROCESSING_STYLES":
        return "Processing styles...";
      case "SAVING_MENUS":
        return `Saving menu content...${getProgressText()}`;
      case "SAVING_FILES":
        return `Saving file content...${getProgressText()}`;
      case "SAVING_PANES":
        return `Saving pane content...${getProgressText()}`;
      case "SAVING_STORY_FRAGMENTS":
        return `Saving story content...${getProgressText()}`;
      case "COMPLETED":
        return "Save completed successfully!";
      case "ERROR":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  const handleCloseClick = () => {
    // Only allow close if save is completed or errored
    if (stage === "COMPLETED" || stage === "ERROR") {
      onClose();
    }
  };

  return (
    <>
      {/* Full screen blocking overlay - cannot be clicked through */}
      <div
        className="fixed inset-0 z-[10100] bg-transparent"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "all",
          cursor: "not-allowed",
          touchAction: "none",
          userSelect: "none",
        }}
      />

      {/* Modal overlay with visible background */}
      <div
        className="fixed inset-0 z-[10101] bg-black/50 flex items-center justify-center"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-white p-8 rounded-lg shadow-xl w-full m-4 max-w-3xl max-h-[90vh] overflow-y-auto"
          style={{ cursor: "default" }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Saving Changes</h2>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </button>
          </div>

          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className={classNames(
                  "h-full rounded-full transition-all duration-500",
                  stage === "COMPLETED" ? "bg-green-500" : "bg-blue-500",
                  stage === "ERROR" ? "bg-red-500" : ""
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <p className="text-lg mb-4">{getStageDescription(stage)}</p>

          {/* Debug section - only visible when showDebug is true */}
          {showDebug && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Debug Information</h3>

              {/* Generated image preview */}
              {debugImage && (
                <div className="mb-4">
                  <h4 className="text-md font-bold mb-2">Generated OG Image Preview:</h4>
                  <div className="relative">
                    <img
                      src={debugImage}
                      alt="Generated OG Image"
                      className="max-w-full h-auto border rounded"
                      style={{ maxHeight: "200px" }}
                    />
                    <button
                      onClick={() => setDebugImage(null)}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Debug log */}
              <div>
                <h4 className="text-md font-bold mb-2">Debug Log:</h4>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono max-h-60 overflow-y-auto">
                  {debugMessages.map((msg, idx) => (
                    <div key={idx} className="mb-1">
                      {msg}
                    </div>
                  ))}
                  {debugMessages.length === 0 && (
                    <div className="text-gray-500">No log entries yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(stage === "COMPLETED" || stage === "ERROR") && (
            <div className="flex justify-end gap-2 mt-4">
              {stage === "ERROR" && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Reload Page
                </button>
              )}
              <button
                onClick={handleCloseClick}
                className={classNames(
                  "px-4 py-2 rounded",
                  stage === "COMPLETED"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-500 hover:bg-gray-600 text-white"
                )}
              >
                {stage === "COMPLETED" ? "Close" : "Cancel"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SaveModal;
