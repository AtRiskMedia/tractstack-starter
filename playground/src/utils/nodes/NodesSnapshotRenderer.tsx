import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { blobToBase64, timestampNodeId } from "@/utils/common/helpers.ts";
import { Node } from "@/components/storykeep/compositor-nodes/Node.tsx";
import type { Config } from "@/types.ts";
import type { NodesContext } from "@/store/nodes.ts";

export type SnapshotData = {
  imageData: string;
  height: number;
};

export type NodesSnapshotRendererProps = {
  ctx: NodesContext;
  onComplete?: ((data: SnapshotData) => void) | undefined;
  forceRegenerate: boolean;
  config?: Config;
};

const snapshotCache = new Map<string, SnapshotData>();

export const NodesSnapshotRenderer = (props: NodesSnapshotRendererProps) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (!isGenerating && !props.forceRegenerate) return;
    if (props.ctx.allNodes.get().size === 0) return;

    const cacheKey = timestampNodeId(props.ctx.rootNodeId.get());
    if (!props.forceRegenerate && snapshotCache.has(cacheKey)) {
      const cached = snapshotCache.get(cacheKey);
      props.onComplete?.(cached!);
      setIsGenerating(false);
      return;
    }

    const generateSnapshot = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1050));

        if (!contentRef.current) return;

        const height = contentRef.current.offsetHeight;
        const scale = 800 / 1500; // Target width 800px while maintaining aspect ratio
        const scaledHeight = height * scale;

        const pngImage = await toPng(contentRef.current, {
          width: 1500,
          height: height,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
          pixelRatio: 1,
          backgroundColor: "#ffffff",
          quality: 1,
          canvasWidth: 1500,
          canvasHeight: height,
        });

        const img = new Image();
        img.src = pngImage;
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement("canvas");
        canvas.width = 800; // Target width
        canvas.height = scaledHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, 800, scaledHeight);

        const webpBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
        });
        const base64 = await blobToBase64(webpBlob);

        if (props.onComplete && typeof base64 === "string") {
          const data = { imageData: base64, height: scaledHeight };
          snapshotCache.set(cacheKey, data);
          props.onComplete(data);
        }
      } catch (error) {
        console.error("Error generating snapshot:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();
  }, [props.ctx, props.forceRegenerate]);

  //console.log(`new context`, props.ctx.allNodes.get());

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
