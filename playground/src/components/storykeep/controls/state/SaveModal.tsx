import { useState, useEffect, useRef } from "react";
import { getCtx } from "@/store/nodes";
import { classNames } from "@/utils/common/helpers";
import { NodesSerializer_Json } from "@/store/nodesSerializer_Json";
import type { SaveData } from "@/store/nodesSerializer";

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

  useEffect(() => {
    const saveChanges = async () => {
      if (isSaving.current) return;
      isSaving.current = true;

      const ctx = getCtx();
      const serializer = new NodesSerializer_Json();

      try {
        // Process nodes through serializer first
        const saveResult = serializer.save(ctx);
        if (!saveResult) {
          console.log("No changes to save");
          setStage("COMPLETED");
          return;
        }

        // Convert boolean result to SaveData
        const saveData = saveResult as unknown as SaveData;

        // Save Menu nodes
        if (saveData.menus?.length > 0) {
          setStage("SAVING_MENUS");
          setProgress(10);
          setItemProgress({ currentItem: 0, totalItems: saveData.menus.length });

          for (let i = 0; i < saveData.menus.length; i++) {
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

          for (let i = 0; i < saveData.files.length; i++) {
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

          for (let i = 0; i < saveData.panes.length; i++) {
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

        // Save StoryFragment nodes last
        if (saveData.storyfragments?.length > 0) {
          setStage("SAVING_STORY_FRAGMENTS");
          setProgress(70);
          setItemProgress({ currentItem: 0, totalItems: saveData.storyfragments.length });

          for (let i = 0; i < saveData.storyfragments.length; i++) {
            const response = await fetch("/api/turso/upsertStoryFragment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(saveData.storyfragments[i]),
            });

            if (!response.ok) {
              throw new Error("Failed to save story fragment");
            }
            setItemProgress((prev) => ({ ...prev, currentItem: i + 1 }));
          }
        }

        // Mark all nodes as clean
        ctx.getDirtyNodes().forEach((node) => {
          if (node.isChanged) {
            ctx.cleanNode(node.id);
          }
        });

        // Process Tailwind styles
        setStage("PROCESSING_STYLES");
        setProgress(80);

        const isMultiTenant = import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true";
        // skip in multi-tenant
        if (!isMultiTenant)
          try {
            const response = await fetch("/api/tailwind/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (!response.ok) {
              throw new Error("Failed to generate Tailwind styles");
            }
          } catch (styleError) {
            console.error("Style processing error:", styleError);
            // Continue with save process even if style generation fails
          }

        setProgress(100);
        setStage("COMPLETED");
        if (onSaveComplete) {
          onSaveComplete();
        }
      } catch (err) {
        setStage("ERROR");
        setError(err instanceof Error ? err.message : "An unknown error occurred");
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

  return (
    <div className="fixed inset-0 z-[10101] bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full m-4">
        <h2 className="text-2xl font-bold mb-4">Saving Changes</h2>

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

        {(stage === "COMPLETED" || stage === "ERROR") && (
          <div className="flex justify-end gap-2">
            {stage === "ERROR" && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reload Page
              </button>
            )}
            <button
              onClick={onClose}
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
  );
};

export default SaveModal;
