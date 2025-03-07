import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefs } from "../../../store/beliefs";
import { pageLoadTime } from "../../../store/events";
import type { BeliefStore, BeliefDatum } from "../../../types";
import { smoothScrollToPane } from "@/utils/common/domHelpers.ts";

// Separate the pure calculation functions
const calculateVisibility = (
  heldBeliefsFilter: Record<string, string | string[]> | undefined,
  withheldBeliefsFilter: Record<string, string | string[]> | undefined,
  reveal: boolean,
  overrideWithhold: boolean
): boolean => {
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
};

const matchesBelief = (belief: BeliefStore, key: string, value: string): boolean =>
  belief.slug === key && (belief.verb === value || value === "*" || belief.object === value);

const processFilter = (
  filter: Record<string, string | string[]>,
  beliefs: BeliefStore[],
  shouldMatchAll: boolean = true
): boolean => {
  // If no filters, return appropriate default
  if (!filter || Object.keys(filter).length === 0) {
    return shouldMatchAll;
  }

  for (const [key, valueOrValues] of Object.entries(filter)) {
    const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];

    // Check if ANY of the values match for this belief tag
    const anyValueMatches = values.some((value) =>
      beliefs.some((belief) => matchesBelief(belief, key, value))
    );

    // For AND logic between tags (shouldMatchAll=true), one failure means overall failure
    if (shouldMatchAll && !anyValueMatches) {
      return false;
    }

    // For OR logic between tags (shouldMatchAll=false), one success means overall success
    if (!shouldMatchAll && anyValueMatches) {
      return true;
    }
  }

  // If we get here with shouldMatchAll=true, all criteria were met
  // If we get here with shouldMatchAll=false, no criteria were met
  return shouldMatchAll;
};

// Memoized style objects
const visibleStyles = {
  opacity: "1",
  height: "auto",
  overflow: "visible",
  clipPath: "none",
  margin: "",
} as const;

const hiddenStyles = {
  opacity: "0",
  height: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  margin: "0",
} as const;

export function useFilterPane(
  id: string,
  heldBeliefsFilter: BeliefDatum,
  withheldBeliefsFilter: BeliefDatum
) {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const [reveal, setReveal] = useState(false);
  const [ready, setReady] = useState(false);
  const [overrideWithhold, setOverrideWithhold] = useState(false);
  const isFirstRender = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Evaluate beliefs when dependencies change
  useEffect(() => {
    const evaluateBeliefs = () => {
      if (heldBeliefsFilter && Object.keys(heldBeliefsFilter)?.length) {
        setReveal(processFilter(heldBeliefsFilter, $heldBeliefsAll));
      } else {
        setReveal(true);
      }

      if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter)?.length) {
        setOverrideWithhold(!processFilter(withheldBeliefsFilter, $heldBeliefsAll, false));
      } else {
        setOverrideWithhold(true);
      }

      // Use RAF instead of setTimeout for better browser optimization
      requestAnimationFrame(() => setReady(true));
    };

    evaluateBeliefs();
  }, [$heldBeliefsAll, heldBeliefsFilter, withheldBeliefsFilter]);

  // Reset ready state on page load
  useEffect(() => {
    if (ready) setReady(false);
  }, [pageLoadTime]);

  // Handle visibility and scrolling
  useEffect(() => {
    const thisPane = document.getElementById(`pane-${id}`);
    if (!thisPane) {
      console.error(`Pane ${id} not found`);
      return;
    }

    const isVisible = calculateVisibility(
      heldBeliefsFilter,
      withheldBeliefsFilter,
      reveal,
      overrideWithhold
    );

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Apply visibility styles
    if (isVisible) {
      thisPane.classList.remove("invisible");
      Object.assign(thisPane.style, visibleStyles);
    } else {
      thisPane.classList.add("invisible");
      thisPane.classList.remove("motion-safe:animate-fadeInUp");
      Object.assign(thisPane.style, hiddenStyles);
    }

    // Handle smooth scrolling
    if (isVisible && !isFirstRender.current && ready) {
      const timeoutId = smoothScrollToPane(thisPane, 20, 50);
      if (timeoutId) {
        scrollTimeoutRef.current = timeoutId;
      }
    }

    isFirstRender.current = false;

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [id, reveal, overrideWithhold, ready]);
}
