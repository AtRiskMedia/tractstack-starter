import { useEffect, useState } from "react";
import { NodesContext } from "@/store/nodes";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { getTemplateVisualBreakPane } from "@/utils/TemplatePanes";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";

interface VisualBreakPreviewProps {
  bgColour: string;
  fillColour: string;
  variant?: string; // Optional variant name for the visual break
  height?: number; // Optional height for the container
}

export const VisualBreakPreview = ({
  bgColour,
  fillColour,
  variant = "cutwide2", // Default to cutwide2 as it's a commonly used break
  height = 120, // Default height that works well for most breaks
}: VisualBreakPreviewProps) => {
  const [preview, setPreview] = useState<{
    ctx: NodesContext;
    snapshot?: SnapshotData;
  } | null>(null);

  useEffect(() => {
    // Create a new context for the visual break
    const ctx = new NodesContext();

    // Add root node
    ctx.addNode(createEmptyStorykeep("tmp"));

    // Get the template for the specified variant
    const template = getTemplateVisualBreakPane(variant);
    if (template?.bgColour) template.bgColour = bgColour;
    if (template?.bgPane && template.bgPane.type === "visual-break") {
      if (template.bgPane.breakDesktop) {
        template.bgPane.breakDesktop.svgFill = fillColour;
      }
      if (template.bgPane.breakTablet) {
        template.bgPane.breakTablet.svgFill = fillColour;
      }
      if (template.bgPane.breakMobile) {
        template.bgPane.breakMobile.svgFill = fillColour;
      }
    }

    // Add the template to the context
    ctx.addTemplatePane("tmp", template);

    // Set the preview
    setPreview({ ctx });
  }, [variant]);

  if (!preview) {
    return <div className="h-12 bg-gray-200 animate-pulse my-4" />;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={!preview.snapshot ? { height: `${height}px` } : undefined}
    >
      {!preview.snapshot && (
        <NodesSnapshotRenderer
          ctx={preview.ctx}
          forceRegenerate={false}
          outputWidth={800}
          onComplete={(data) => {
            setPreview((prev) => (prev ? { ...prev, snapshot: data } : null));
          }}
        />
      )}
      {preview.snapshot && (
        <div className="w-full">
          <img
            src={preview.snapshot.imageData}
            alt={`Visual break ${variant}`}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default VisualBreakPreview;
