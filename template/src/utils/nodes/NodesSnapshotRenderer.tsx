import type { NodesContext } from "@/store/nodes.ts";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { blobToBase64, timestampNodeId } from "@/utils/common/helpers.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import type { Config } from "@/types.ts";

export type NodesSnapshotRendererProps = {
  ctx: NodesContext;
  onComplete?: ((imageData: string) => void) | undefined;
  forceRegenerate: boolean;
  config?: Config;
};

export const NodesSnapshotRenderer = (props: NodesSnapshotRendererProps) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("ctx updated");
    if (!contentRef.current) return;
    if (!isGenerating && !props.forceRegenerate) return;
    if(props.ctx.allNodes.get().size === 0) return;

    const generateSnapshot = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1050));

        if (!contentRef.current) return;

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
        const base64 = await blobToBase64(webpBlob);

        if (props.onComplete && typeof base64 === "string") {
          props.onComplete(base64);
        }
      } catch (error) {
        console.error("Error generating snapshot:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();
  }, [props.ctx, props.forceRegenerate]);

  return (
    <>
      {(isGenerating || props.forceRegenerate) && (
        <div className="absolute inset-0 flex items-center justify-center bg-mylightgrey/10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange mx-auto"></div>
            <p className="mt-2 text-sm text-mydarkgrey">Generating preview...</p>
          </div>
        </div>
      )}

      <div
        className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          ref={contentRef}
          className="w-[1500px]"
          style={{
            backgroundColor: "#FFFFFF",
            isolation: "isolate",
          }}
        >
          <Node
            nodeId={props.ctx.rootNodeId.get()}
            key={timestampNodeId(props.ctx.rootNodeId.get())}
            ctx={props.ctx}
            config={props.config}
          />
        </div>
      </div>
    </>
  );
};
