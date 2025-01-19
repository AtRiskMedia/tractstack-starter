import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { PaneMode } from "./AddPanePanel";
import { NodesContext } from "@/store/nodes.ts";
import { NodesSnapshotRenderer } from "@/utils/nodes/NodesSnapshotRenderer.tsx";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper.ts";
import { getTemplateSimplePane } from "@/utils/TemplatePanes.ts";

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const AddPaneNewPanel = ({ nodeId, first, setMode }: AddPaneNewPanelProps) => {
  const [ctx, setCtx] = useState<NodesContext[]>([new NodesContext(), new NodesContext()]);
  const [snapshotImage1, setSnapshotImage1] = useState<string>("");
  const [snapshotImage2, setSnapshotImage2] = useState<string>("");

  useEffect(() => {
    const tmpCtx1 = new NodesContext();
    tmpCtx1.addNode(createEmptyStorykeep("tmp"));
    tmpCtx1.addTemplatePane("tmp", getTemplateSimplePane("dark"));
    const tmpCtx2 = new NodesContext();
    tmpCtx2.addNode(createEmptyStorykeep("tmp"));
    tmpCtx2.addTemplatePane("tmp", getTemplateSimplePane("light"));
    setCtx([tmpCtx1, tmpCtx2]);
  }, []);

  console.log(nodeId, first);
  return (
    <div className="p-0.5 shadow-inner">
      <div className="flex flex-col gap-2 mb-1.5">
        <div className="p-1.5 bg-white rounded-md flex gap-1 w-full">
          <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
            Design New Pane
          </div>
          <div className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
            + Placeholder 1
            <NodesSnapshotRenderer
              ctx={ctx[0]}
              forceRegenerate={false}
              config={undefined}
              onComplete={(imageData) => setSnapshotImage1(imageData)}
            />
            <div className="relative">
              <img
                src={snapshotImage1}
                alt={`design preview`}
                width={550}
                height={350}
                style={{ width: "550px", maxWidth: "550px", height: "350px" }}
                className="absolute inset-0"
              />
            </div>
          </div>
          <div className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
            + Placeholder 2
            <NodesSnapshotRenderer
              ctx={ctx[1]}
              forceRegenerate={false}
              config={undefined}
              onComplete={(imageData) => setSnapshotImage2(imageData)}
            />
            <div className="relative">
              <img
                src={snapshotImage2}
                alt={`design preview`}
                width={550}
                height={350}
                style={{ top: "350px", width: "550px", maxWidth: "550px", height: "350px" }}
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setMode(PaneMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
};

export default AddPaneNewPanel;
