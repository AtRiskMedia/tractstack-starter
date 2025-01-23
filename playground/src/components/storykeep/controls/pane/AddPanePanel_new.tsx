import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { PaneMode } from "./AddPanePanel";
import { NodesContext } from "@/store/nodes.ts";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer.tsx";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper.ts";
import { getTemplateMarkdownPane, getTemplateSimplePane } from "@/utils/TemplatePanes.ts";

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
}

const ITEMS_PER_PAGE = 4;

const AddPaneNewPanel = ({ nodeId, first, setMode }: AddPaneNewPanelProps) => {
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const templates = [
      getTemplateMarkdownPane("dark"),
      getTemplateSimplePane("light"),
      getTemplateMarkdownPane("light"),
      getTemplateSimplePane("dark"),
      getTemplateMarkdownPane("light-bw"),
      getTemplateMarkdownPane("light-bold"),
    ];

    setPreviews(
      templates.map((template) => {
        const ctx = new NodesContext();
        ctx.addNode(createEmptyStorykeep("tmp"));
        ctx.addTemplatePane("tmp", template);
        return { ctx };
      })
    );
  }, []);

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visiblePreviews = previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4">
      <h3 className="py-6 font-action font-bold text-xl text-black">Select a design to insert</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {visiblePreviews.map((preview, index) => (
          <div
            key={index}
            onClick={() => console.log("Selected template:", index + 1)}
            className={`relative w-full min-h-[100px] rounded-sm cursor-pointer transition-all duration-200 ${preview.snapshot && `hover:outline hover:outline-4 hover:outline-dashed hover:outline-mydarkgrey`}`}
            style={{
              background:
                "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
            }}
          >
            <NodesSnapshotRenderer
              ctx={preview.ctx}
              forceRegenerate={false}
              config={undefined}
              onComplete={(data) => {
                setPreviews((prev) => {
                  const newPreviews = [...prev];
                  newPreviews[startIndex + index] = {
                    ...newPreviews[startIndex + index],
                    snapshot: data,
                  };
                  return newPreviews;
                });
              }}
            />
            {preview.snapshot && (
              <div className="p-1.5">
                <img
                  src={preview.snapshot.imageData}
                  alt={`Template ${index + 1}`}
                  className="w-full"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setMode(PaneMode.DEFAULT)}
        className="mt-4 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
      >
        ← Go Back
      </button>
    </div>
  );
};

export default AddPaneNewPanel;
