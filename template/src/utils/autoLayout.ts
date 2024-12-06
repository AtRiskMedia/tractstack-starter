import type { PaneDesign, PaneDesignMarkdown } from "@/types.ts";
import { paneFragmentBgColour, paneFragmentIds, paneFragmentMarkdown } from "@/store/storykeep.ts";

export const applyLayoutChange = (paneId: string, paneDesign: PaneDesign) => {
  if(paneId?.length === 0 || !paneDesign) return;

  const fragments = paneFragmentIds.get()[paneId].current;
  const concretePaneFragment = paneFragmentMarkdown.get()[fragments.last()];
  if(!concretePaneFragment) return;

  // overwrite class names and payloads
  const firstFragment = paneDesign.fragments[0] as PaneDesignMarkdown;
  const firstGragmentPayload = firstFragment.optionsPayload;
  concretePaneFragment.current.payload.optionsPayload.classNamesPayload = {...firstGragmentPayload.classNamesPayload};
  if(firstGragmentPayload.classNamesParent) {
    concretePaneFragment.current.payload.optionsPayload.classNamesParent = { ...firstGragmentPayload.classNamesParent };
  }
  if(firstGragmentPayload.classNames) {
    concretePaneFragment.current.payload.optionsPayload.classNames = { ...firstGragmentPayload.classNames };
  }

  // update background
  const paneBgs = {...paneFragmentBgColour.get()};
  paneBgs[fragments[0]].current.bgColour = paneDesign.panePayload.bgColour as string;
  paneFragmentBgColour.set(paneBgs);
}