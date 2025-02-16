import { useState, useEffect } from "react";
import { themes } from "@/constants";
import { NodesSnapshotRenderer } from "@/utils/nodes/NodesSnapshotRenderer";
import { NodesContext } from "@/store/nodes";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { brandColours, preferredTheme } from "@/store/storykeep.ts";
import type { Theme, PageDesign, StoryFragmentNode } from "@/types";
import type { SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { getJustCopyDesign, getIntroDesign } from "@/utils/designs/templateMarkdownStyles";
import {
  parsePageMarkdown,
  createPagePanes,
  validatePageMarkdown,
} from "@/utils/designs/processMarkdown";

function getPageDesigns(brand: string, theme: Theme): PageDesign[] {
  return [
    {
      id: "minimal",
      title: "Minimal Layout",
      introDesign: getIntroDesign(theme, brand, false),
      contentDesign: getJustCopyDesign(theme, brand, false),
    },
  ];
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  design: PageDesign;
  index: number;
}

interface PageCreationPreviewProps {
  markdownContent: string;
  onComplete: (previewCtx: NodesContext) => void;
  onBack: () => void;
  nodeId: string;
  ctx: NodesContext;
}

export const PageCreationPreview = ({
  markdownContent,
  onComplete,
  onBack,
  nodeId,
  ctx,
}: PageCreationPreviewProps) => {
  console.log(`markdown`, JSON.stringify(markdownContent));
  const [selectedTheme, setSelectedTheme] = useState<Theme>(preferredTheme.get());
  const [selectedDesignIndex, setSelectedDesignIndex] = useState(0);
  const [preview, setPreview] = useState<PreviewPane | null>(null);
  const [error, setError] = useState<string | null>(null);

  const brand = brandColours.get();
  const pageDesigns = getPageDesigns(brand, selectedTheme);

  useEffect(() => {
    if (!markdownContent) return;

    try {
      if (!validatePageMarkdown(markdownContent)) {
        setError("Invalid page structure");
        return;
      }

      const previewCtx = new NodesContext();
      previewCtx.addNode(createEmptyStorykeep("tmp"));

      const processedPage = parsePageMarkdown(markdownContent);
      const design = pageDesigns[selectedDesignIndex];
      const paneIds = createPagePanes(processedPage, design, previewCtx);

      const pageNode = previewCtx.allNodes.get().get("tmp") as StoryFragmentNode;
      if (pageNode) {
        pageNode.paneIds = paneIds;
      }

      setPreview({
        ctx: previewCtx,
        design: design,
        index: selectedDesignIndex,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    }
  }, [markdownContent, selectedTheme, selectedDesignIndex]);

  return (
    <div className="p-6 bg-white rounded-md">
      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as Theme)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            >
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
            <select
              value={selectedDesignIndex}
              onChange={(e) => setSelectedDesignIndex(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            >
              {pageDesigns.map((design, idx) => (
                <option key={design.id} value={idx}>
                  {design.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => preview?.ctx && onComplete(preview.ctx)}
            className="px-4 py-2 text-sm font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            disabled={!preview?.ctx || !!error}
          >
            Apply Design
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4">
        {!preview ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : (
          <div className="bg-white shadow-lg">
            {preview.snapshot ? (
              <div className="p-0.5">
                <img
                  src={preview.snapshot.imageData}
                  alt={`Design ${preview.index + 1}`}
                  className="w-full"
                />
              </div>
            ) : (
              <NodesSnapshotRenderer
                ctx={preview.ctx}
                forceRegenerate={false}
                onComplete={(data) => {
                  setPreview((prev) => (prev ? { ...prev, snapshot: data } : null));
                }}
                outputWidth={800}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageCreationPreview;
