import type { PaneDesign, PaneDesignMarkdown } from "@/types.ts";
import { paneFragmentBgColour, paneFragmentIds, paneFragmentMarkdown } from "@/store/storykeep.ts";

export const applyLayoutChange = (paneId: string, paneDesign: PaneDesign) => {
  if (paneId?.length === 0 || !paneDesign) return;

  const fragments = paneFragmentIds.get()[paneId].current;
  const concretePaneFragment = paneFragmentMarkdown.get()[fragments.last()];
  if (!concretePaneFragment) return;

  // overwrite class names and payloads
  const newFragment = paneDesign.fragments[0] as PaneDesignMarkdown;
  const newFragmentPayload = newFragment.optionsPayload;
  const currentPaneFragmentPayload = concretePaneFragment.current.payload.optionsPayload;

  // save original snapshot before the changes
  const payloadSnapshot = { ...currentPaneFragmentPayload.classNamesPayload };
  currentPaneFragmentPayload.classNamesPayload = { ...newFragmentPayload.classNamesPayload };
  Object.keys(currentPaneFragmentPayload.classNamesPayload).forEach((className) => {
    // if original snapshot had overrides then apply them to a new payload
    if(newFragmentPayload.classNamesPayload[className].override) {
      return;
    }

    if (payloadSnapshot[className].override) {
      currentPaneFragmentPayload.classNamesPayload[className].override = {
        ...payloadSnapshot[className].override,
      };
    }
  });
  // copy parent classes
  if (newFragmentPayload.classNamesParent) {
    currentPaneFragmentPayload.classNamesParent = { ...newFragmentPayload.classNamesParent };
  }
  // copy class names
  if (newFragmentPayload.classNames) {
    currentPaneFragmentPayload.classNames = { ...newFragmentPayload.classNames };
  }
  // copy button names
  if(newFragmentPayload.buttons) {
    currentPaneFragmentPayload.buttons = { ...newFragmentPayload.buttons };
  }

  // update background
  const paneBgs = { ...paneFragmentBgColour.get() };
  paneBgs[fragments[0]].current.bgColour = paneDesign.panePayload.bgColour as string;
  paneFragmentBgColour.set(paneBgs);
};
