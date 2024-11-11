import PreviewPaneRenderer from "./PreviewPaneRenderer";
import preparePreviewPane from "../../../utils/compositor/preparePreviewPane";
import type { ViewportAuto, PaneDesign } from "../../../types";

interface PreviewPaneProps {
  design: PaneDesign;
  viewportKey: ViewportAuto;
  slug: string;
  isContext: boolean;
}

const PreviewPane = ({ design, viewportKey, slug, isContext }: PreviewPaneProps) => {
  if (!design || !design.fragments) {
    console.error("Invalid design object received in PreviewPane:", design);
    return <div>Error: Invalid pane design</div>;
  }

  let paneData;
  try {
    paneData = preparePreviewPane(design);
  } catch (error) {
    console.error("Error in preparePreviewPane:", error);
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> Unable to preview this design.</span>
      </div>
    );
  }

  if (design.panePayload?.codeHook) {
    return (
      <div className="bg-yellow-300 p-4 rounded-md text-center">
        <h2 className="text-xl text-black font-bold mb-2">
          Code Hook: {design.panePayload.codeHook}
        </h2>
      </div>
    );
  }

  return (
    <PreviewPaneRenderer
      paneData={paneData}
      viewportKey={viewportKey}
      toolMode="text"
      toolAddMode="p"
      slug={slug}
      isContext={isContext}
    />
  );
};

export default PreviewPane;
