import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefs } from "../../../store/beliefs";
import { pageLoadTime } from "../../../store/events";
import type { BeliefStore, BeliefDatum } from "../../../types";
import { smoothScrollToPane } from "@/utils/common/domHelpers.ts";

const SCROLL_PREVENTION_PERIOD = 5000;
const DOM_UPDATE_DELAY = 50;

function calculateVisibility(
  heldBeliefsFilter: Record<string, string | string[]> | undefined,
  withheldBeliefsFilter: Record<string, string | string[]> | undefined,
  reveal: boolean,
  overrideWithhold: boolean
): boolean {
  if (heldBeliefsFilter && !withheldBeliefsFilter) {
    return reveal;
  }
  if (!heldBeliefsFilter && withheldBeliefsFilter) {
    return overrideWithhold;
  }
  if (heldBeliefsFilter && withheldBeliefsFilter) {
    return reveal && overrideWithhold;
  }
  return false;
}

function matchesBelief(belief: BeliefStore, key: string, value: string): boolean {
  return belief.slug === key && (belief.verb === value || value === "*" || belief.object === value);
}

// Helper function to process a filter object
function processFilter(
  filter: Record<string, string | string[]>,
  beliefs: BeliefStore[],
  shouldMatchAll: boolean = true
): boolean {
  let match = false;
  let all = true;

  Object.entries(filter).forEach(([key, value]) => {
    if (typeof value === "string") {
      const matchingBelief = beliefs.find((belief) => matchesBelief(belief, key, value));
      if (matchingBelief) match = true;
      else all = false;
    } else {
      Object.values(value).forEach((v) => {
        const matchingBelief = beliefs.find((belief) => matchesBelief(belief, key, v));
        if (matchingBelief) match = true;
        else all = false;
      });
    }
  });

  return shouldMatchAll ? match && all : match;
}

export const useFilterPane = (
  id: string,
  heldBeliefsFilter: BeliefDatum,
  withheldBeliefsFilter: BeliefDatum
) => {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const [reveal, setReveal] = useState(false);
  const [ready, setReady] = useState(false);
  const [overrideWithhold, setOverrideWithhold] = useState(false);
  const isFirstRender = useRef(true);
  const paneRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const evaluateBeliefs = () => {
    if (heldBeliefsFilter && Object.keys(heldBeliefsFilter)?.length) {
      const result = processFilter(heldBeliefsFilter, $heldBeliefsAll);
      setReveal(result);
    } else {
      setReveal(true);
    }

    if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter)?.length) {
      const result = !processFilter(withheldBeliefsFilter, $heldBeliefsAll, false);
      setOverrideWithhold(result);
    } else {
      setOverrideWithhold(true);
    }

    // set ready next event tick
    setTimeout(() => setReady(true), 1);
  };

  const updatePaneVisibility = (thisPane: HTMLElement, isVisible: boolean) => {
    if (isVisible) {
      thisPane.classList.remove("invisible");
      thisPane.style.opacity = "1";
      thisPane.style.height = "auto";
      thisPane.style.overflow = "visible";
      thisPane.style.clipPath = "none";
      thisPane.style.margin = "";
    } else {
      thisPane.classList.add("invisible");
      thisPane.style.opacity = "0";
      thisPane.style.height = "0";
      thisPane.style.overflow = "hidden";
      thisPane.style.clipPath = "inset(50%)";
      thisPane.style.margin = "0";
      thisPane.classList.remove("motion-safe:animate-fadeInUp");
    }
  };

  useEffect(() => {
    evaluateBeliefs();
  }, [$heldBeliefsAll, heldBeliefsFilter, withheldBeliefsFilter]);

  useEffect(() => {
    if (ready) {
      setReady(false);
    }
  }, [pageLoadTime]);

  useEffect(() => {
    const thisPane = document.querySelector(`#pane-${id}`) as HTMLElement;
    if (!thisPane) {
      console.error(`Pane ${id} not found`);
      return;
    }

    paneRef.current = thisPane;

    const isVisible = calculateVisibility(
      heldBeliefsFilter,
      withheldBeliefsFilter,
      reveal,
      overrideWithhold
    );

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    updatePaneVisibility(thisPane, isVisible);

    if (isVisible && !isFirstRender.current && ready) {
      console.log("smooth scroll: " + Date.now());
      scrollTimeoutRef.current = smoothScrollToPane(thisPane, 20, DOM_UPDATE_DELAY);
    }

    isFirstRender.current = false;

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [id, reveal, overrideWithhold]);
};
