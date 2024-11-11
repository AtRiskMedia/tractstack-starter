import preparePreviewPane from "./preparePreviewPane";
import type { PageDesign, PaneDatum } from "../../types";

const preparePagePreview = (pageDesign: PageDesign): PaneDatum[] => {
  const paneDesigns = Array.isArray(pageDesign.paneDesigns)
    ? pageDesign.paneDesigns
    : [pageDesign.paneDesigns];

  return paneDesigns.map((paneDesign) => preparePreviewPane(paneDesign));
};

export default preparePagePreview;
