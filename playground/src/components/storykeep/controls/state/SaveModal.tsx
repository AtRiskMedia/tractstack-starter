import { useState, useEffect, useRef } from "react";
import { getCtx } from "@/store/nodes";
import { classNames } from "@/utils/common/helpers";
import { NodesSerializer_Json } from "@/store/nodesSerializer_Json";
import { generateOgImageWithFontLoading } from "@/utils/images/ogImageGenerator";
import { tenantIdStore, storyFragmentTopicsStore } from "@/store/storykeep.ts";
import { contentMap } from "@/store/events.ts";
import type { SaveData } from "@/store/nodesSerializer";
import type { StoryFragmentNode, StoryFragmentContentMap, TopicContentMap, Topic } from "@/types";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";

type SaveStage =
  | "PREPARING"
  | "SAVING_MENUS"
  | "SAVING_FILES"
  | "SAVING_PANES"
  | "SAVING_STORY_FRAGMENTS"
  | "SAVING_SEO_TOPICS"
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
  const tenantId = tenantIdStore.get();
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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (e.key !== "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === "Escape" && (stage === "COMPLETED" || stage === "ERROR")) {
        onClose();
      }
    };

    window.addEventListener("keydown", preventKeyboardShortcuts, true);

    return () => {
      document.body.style.overflow = originalOverflow;
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
        addDebugMessage("Serializing nodes...");
        const saveResult = serializer.save(ctx);
        if (!saveResult) {
          console.log("No changes to save");
          addDebugMessage("No changes detected to save");
          setStage("COMPLETED");
          return;
        }

        const saveData = saveResult as unknown as SaveData;
        addDebugMessage(
          `Found data to save: Menus:${saveData.menus?.length}, Files:${saveData.files?.length}, Panes:${saveData.panes?.length}, Fragments:${saveData.storyfragments?.length}`
        );

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

            // Find the corresponding markdown from saveData.markdowns
            const markdownData = pane.markdown_id
              ? saveData.markdowns.find((m) => m.id === pane.markdown_id)
              : undefined;

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
              markdownData: markdownData,
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

        const storySEOData = storyFragmentTopicsStore.get();
        const hasStorySEOData = Object.keys(storySEOData).length > 0;

        // Track all updated topics with their real database IDs
        const allUpdatedTopics: Map<string, Topic[]> = new Map();

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

            if (typeof fragment.social_image_path !== "string") {
              fragment.social_image_path = null;

              try {
                const allNodes = ctx.allNodes.get();
                const node = allNodes.get(fragment.id) as StoryFragmentNode;

                if (node && fragment.title) {
                  addDebugMessage("Getting OG parameters for generation");
                  const params = ctx.getOgImageParams(fragment.id);
                  addDebugMessage(
                    `OG params: text:${params.textColor}, bg:${params.bgColor}, font:${params.fontSize || "auto"}`
                  );

                  addDebugMessage("Generating OG image...");
                  const imageData = await generateOgImageWithFontLoading(fragment.title, params);
                  addDebugMessage("Image generation complete");

                  setDebugImage(imageData);

                  const filename = `${fragment.id}-${Date.now()}.png`;
                  addDebugMessage(`Saving OG image with filename: ${filename}`);

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
              }
            }

            if (hasStorySEOData && storySEOData[fragment.id]) {
              const seoData = storySEOData[fragment.id];
              fragment.pendingTopics = {
                topics: seoData.topics || [],
                description: seoData.description || "",
              };
              addDebugMessage(
                `Added SEO data to fragment ${fragment.id}: ${seoData.topics?.length || 0} topics`
              );
            }

            addDebugMessage(
              `Saving fragment: ${fragment.id}, socialImagePath: ${fragment.social_image_path}`
            );

            // Make the API call and get the response with updated topic IDs
            const response = await fetch("/api/turso/upsertStoryFragment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fragment),
            });

            if (!response.ok) {
              throw new Error("Failed to save story fragment");
            }

            // Extract the updatedTopics from the response
            const responseData = await response.json();
            if (responseData.data?.updatedTopics && responseData.data.updatedTopics.length > 0) {
              allUpdatedTopics.set(fragment.id, responseData.data.updatedTopics);
              addDebugMessage(
                `Received ${responseData.data.updatedTopics.length} updated topics with IDs from server`
              );
            }

            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        if (hasStorySEOData) {
          setStage("SAVING_SEO_TOPICS");
          setProgress(65);

          addDebugMessage("Updating client-side content map with SEO data");

          const currentContentMap = contentMap.get();
          const updatedContentMap = [...currentContentMap];
          let allTopics: Topic[] = [];

          // First find the all-topics entry and collect existing topics
          const topicsMapIndex = updatedContentMap.findIndex(
            (item) => item.type === "Topic" && item.id === "all-topics"
          );

          if (topicsMapIndex !== -1) {
            const topicsMap = updatedContentMap[topicsMapIndex] as TopicContentMap;
            allTopics = [...topicsMap.topics];
          }

          // Update story fragments and collect topics with real IDs
          for (const [fragmentId, seoData] of Object.entries(storySEOData)) {
            const fragmentIndex = updatedContentMap.findIndex(
              (item) => item.type === "StoryFragment" && item.id === fragmentId
            );

            if (fragmentIndex !== -1) {
              const fragment = updatedContentMap[fragmentIndex] as StoryFragmentContentMap;

              // Get the updated topics with real IDs from the server response
              const updatedTopicsFromServer = allUpdatedTopics.get(fragmentId) || [];

              updatedContentMap[fragmentIndex] = {
                ...fragment,
                topics: seoData.topics?.map((topic) => topic.title) || [],
                description: seoData.description || fragment.description,
              };

              // Add any topics to the all-topics collection, using real IDs from server when available
              if (seoData.topics && seoData.topics.length > 0) {
                for (const topicItem of seoData.topics) {
                  // Find if this topic has a real ID from the server response
                  const matchingServerTopic = updatedTopicsFromServer.find(
                    (serverTopic) =>
                      serverTopic.title.toLowerCase() === topicItem.title.toLowerCase()
                  );

                  const realTopicId = matchingServerTopic ? matchingServerTopic.id : -1;

                  // Create proper Topic object with real ID from server when available
                  const topic: Topic = {
                    id: realTopicId,
                    title: topicItem.title,
                  };

                  // Check if topic already exists by title, case-insensitive
                  const existingIndex = allTopics.findIndex(
                    (t) => t.title.toLowerCase() === topic.title.toLowerCase()
                  );

                  if (existingIndex === -1) {
                    // Topic doesn't exist, add it
                    allTopics.push(topic);
                  } else if (realTopicId !== -1 && allTopics[existingIndex].id === -1) {
                    // If we now have a real ID for a previously temporary topic, update it
                    allTopics[existingIndex].id = realTopicId;
                    addDebugMessage(
                      `Updated topic ID for "${topic.title}" from -1 to ${realTopicId}`
                    );
                  }
                }
              }

              addDebugMessage(`Updated client-side content map for fragment ${fragmentId}`);
            }
          }

          // Update the all-topics entry if it exists
          if (topicsMapIndex !== -1) {
            updatedContentMap[topicsMapIndex] = {
              ...updatedContentMap[topicsMapIndex],
              topics: allTopics,
            } as TopicContentMap;

            // Log topic statistics for debugging
            const newTopics = allTopics.filter((t) => t.id === -1).length;
            const realIdTopics = allTopics.length - newTopics;

            addDebugMessage(
              `Updated all-topics with ${allTopics.length} topics (${realIdTopics} with real IDs, ${newTopics} with temporary IDs)`
            );
          }

          // Set the updated content map
          contentMap.set(updatedContentMap);
        }

        addDebugMessage("Cleaning dirty nodes");
        ctx.getDirtyNodes().forEach((node) => {
          if (node.isChanged) {
            ctx.cleanNode(node.id);
          }
        });

        setStage("PROCESSING_STYLES");
        setProgress(80);
        addDebugMessage("Processing styles");

        const isMultiTenant =
          import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;
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
      case "SAVING_SEO_TOPICS":
        return "Updating SEO topics and descriptions...";
      case "COMPLETED":
        return "Save completed successfully!";
      case "ERROR":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  const handleCloseClick = () => {
    if (stage === "COMPLETED" || stage === "ERROR") {
      // Redirect to the actual edit URL using the saved node's slug
      const allNodes = getCtx().allNodes.get();
      const node = allNodes.get(nodeId);
      if (node && "slug" in node) {
        const isContextPane = window.location.pathname.includes("/context/");
        const newEditUrl = isContextPane ? `/context/${node.slug}/edit` : `/${node.slug}/edit`;
        window.location.href = newEditUrl;
        return;
      }
      onClose();
    }
  };

  return (
    <>
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

          {showDebug && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-bold mb-2">Debug Information</h3>

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
