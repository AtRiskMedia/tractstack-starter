import PreviewPane from "./PreviewPane";
import type { Config, ViewportAuto, PageDesign } from "../../../types";

interface PreviewPageProps {
  design: PageDesign;
  viewportKey: ViewportAuto;
  slug: string;
  isContext: boolean;
  config: Config;
}

const PreviewPage = ({ design, viewportKey, slug, isContext, config }: PreviewPageProps) => {
  if (!design || !design.paneDesigns || design.paneDesigns.length === 0) {
    console.error("Invalid or empty page design received in PreviewPage:", design);
    return <div>Error: Invalid or empty page design</div>;
  }
  const tailwindBgColour = design.tailwindBgColour || `white`;
  return design.paneDesigns.map((paneDesign, index) => (
    <div key={paneDesign.id || index} className="overflow-hidden">
      <div className={`bg-${tailwindBgColour}`}>
        <PreviewPane
          design={paneDesign}
          viewportKey={viewportKey}
          slug={slug}
          isContext={isContext}
          config={config}
        />
      </div>
    </div>
  ));
};

export default PreviewPage;
