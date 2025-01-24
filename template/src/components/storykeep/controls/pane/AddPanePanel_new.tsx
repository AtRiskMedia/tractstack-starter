import { type Dispatch, type SetStateAction, useEffect, useState, useMemo } from "react";
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
  template: any;
  index: number;
}

const ITEMS_PER_PAGE = 3;

const AddPaneNewPanel = ({ nodeId, first, setMode }: AddPaneNewPanelProps) => {
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([0]));

  const templates = useMemo(
    () => [
      getTemplateMarkdownPane("dark"),
      getTemplateSimplePane("light"),
      getTemplateMarkdownPane("light"),
      getTemplateSimplePane("dark"),
      getTemplateMarkdownPane("light-bw"),
      getTemplateMarkdownPane("light-bold"),
    ],
    []
  );

  useEffect(() => {
    setPreviews(
      templates.map((template, index) => {
        const ctx = new NodesContext();
        ctx.addNode(createEmptyStorykeep("tmp"));
        ctx.addTemplatePane("tmp", template);
        return { ctx, template, index };
      })
    );
  }, [templates]);

  const totalPages = Math.ceil(previews.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      setRenderedPages((prev) => new Set([...prev, newPage]));
    }
  };

  const visiblePreviews = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previews, currentPage]);

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <button
          onClick={() => setMode(PaneMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>
        <div className="flex gap-1">
          <div className="px-2 py-1 text-sm rounded bg-cyan-700 text-white shadow-sm z-10">
            + Design New
          </div>
        </div>
      </div>
      <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
        Click on a design to use:
      </h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {visiblePreviews.map((preview) => (
          <div
            key={preview.index}
            onClick={() => console.log("Selected template:", preview.index + 1)}
            className={`relative w-full min-h-[100px] rounded-sm cursor-pointer transition-all duration-200 ${
              preview.snapshot &&
              `hover:outline hover:outline-4 hover:outline-dashed hover:outline-mydarkgrey`
            }`}
            style={{
              background:
                "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
            }}
          >
            {renderedPages.has(currentPage) && !preview.snapshot && (
              <NodesSnapshotRenderer
                ctx={preview.ctx}
                forceRegenerate={false}
                config={undefined}
                onComplete={(data) => {
                  setPreviews((prev) =>
                    prev.map((p) => (p.index === preview.index ? { ...p, snapshot: data } : p))
                  );
                }}
              />
            )}
            {preview.snapshot && (
              <div className="p-1.5">
                <img
                  src={preview.snapshot.imageData}
                  alt={`Template ${preview.index + 1}`}
                  className="w-full"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-2 mt-4 mb-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex gap-1">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPage === index
                  ? "bg-cyan-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AddPaneNewPanel;
