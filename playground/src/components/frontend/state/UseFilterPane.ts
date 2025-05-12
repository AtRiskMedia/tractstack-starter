import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefs } from "@/store/beliefs";
import { pageLoadTime } from "@/store/events";
import type { BeliefStore, BeliefDatum } from "@/types";
import { smoothScrollToPane } from "@/utils/common/domHelpers.ts";

const matchesBelief = (belief: BeliefStore, key: string, value: string): boolean => {
  if (belief.slug !== key) return false;

  if (belief.verb === "IDENTIFY_AS") {
    return belief.object === value || value === "*";
  }

  return belief.verb === value || value === "*";
};

const hasMatchingBelief = (
  beliefs: BeliefStore[],
  key: string,
  valueOrValues: string | string[]
): boolean => {
  const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];

  return values.some((value) => beliefs.some((belief) => matchesBelief(belief, key, value)));
};

const calculateVisibility = (
  heldBeliefsFilter: Record<string, string | string[]> | undefined,
  withheldBeliefsFilter: Record<string, string | string[]> | undefined,
  revealResult: boolean,
  withholdResult: boolean
): boolean => {
  if (heldBeliefsFilter && Object.keys(heldBeliefsFilter).length > 0) {
    if (!revealResult) return false;
  }

  if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter).length > 0) {
    if (!withholdResult) return false;
  }

  return true;
};

const processHeldBeliefs = (
  filter: Record<string, string | string[]>,
  beliefs: BeliefStore[]
): boolean => {
  // Extract match-across keys
  const matchAcrossKeys = filter["MATCH-ACROSS"]
    ? Array.isArray(filter["MATCH-ACROSS"])
      ? filter["MATCH-ACROSS"]
      : [filter["MATCH-ACROSS"]]
    : [];

  const matchAcrossFilter: Record<string, string | string[]> = {};
  const regularFilter: Record<string, string | string[]> = {};

  // Categorize keys into match-across and regular filters, but skip LINKED-BELIEFS
  Object.entries(filter).forEach(([key, value]) => {
    // Skip the LINKED-BELIEFS key - it doesn't affect visibility
    if (key === "LINKED-BELIEFS") return;

    // Skip the MATCH-ACROSS key itself
    if (key === "MATCH-ACROSS") return;

    if (value == null || (Array.isArray(value) && value.length === 0)) return;

    if (matchAcrossKeys.includes(key)) {
      matchAcrossFilter[key] = value;
    } else {
      regularFilter[key] = value;
    }
  });

  const matchAcrossResult =
    Object.keys(matchAcrossFilter).length === 0
      ? true
      : Object.entries(matchAcrossFilter).some(([key, valueOrValues]) =>
          hasMatchingBelief(beliefs, key, valueOrValues)
        );

  const regularResult =
    Object.keys(regularFilter).length === 0
      ? true
      : Object.entries(regularFilter).every(([key, valueOrValues]) =>
          hasMatchingBelief(beliefs, key, valueOrValues)
        );

  return matchAcrossResult && regularResult;
};

const processWithheldBeliefs = (
  filter: Record<string, string | string[]>,
  beliefs: BeliefStore[]
): boolean => {
  if (!filter || Object.keys(filter).length === 0) return true;

  // Check if any belief matches, ignoring LINKED-BELIEFS
  const matchesAny = Object.entries(filter).some(([key, valueOrValues]) => {
    // Skip LINKED-BELIEFS key - it doesn't affect visibility
    if (key === "LINKED-BELIEFS") return false;

    return hasMatchingBelief(beliefs, key, valueOrValues);
  });

  return !matchesAny;
};

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
  const [revealResult, setRevealResult] = useState(false);
  const [withholdResult, setWithholdResult] = useState(true);
  const [ready, setReady] = useState(false);
  const isFirstRender = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const evaluateBeliefs = () => {
      if (heldBeliefsFilter && Object.keys(heldBeliefsFilter).length > 0) {
        const shouldReveal = processHeldBeliefs(heldBeliefsFilter, $heldBeliefsAll);
        setRevealResult(shouldReveal);
      } else {
        setRevealResult(true);
      }

      if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter).length > 0) {
        const shouldShow = processWithheldBeliefs(withheldBeliefsFilter, $heldBeliefsAll);
        setWithholdResult(shouldShow);
      } else {
        setWithholdResult(true);
      }

      requestAnimationFrame(() => setReady(true));
    };

    evaluateBeliefs();
  }, [$heldBeliefsAll, heldBeliefsFilter, withheldBeliefsFilter, id]);

  useEffect(() => {
    if (ready) setReady(false);
  }, [pageLoadTime]);

  useEffect(() => {
    const thisPane = document.getElementById(`pane-${id}`);
    if (!thisPane) {
      console.error(`Pane ${id} not found`);
      return;
    }

    const isVisible = calculateVisibility(
      heldBeliefsFilter,
      withheldBeliefsFilter,
      revealResult,
      withholdResult
    );

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    if (isVisible) {
      thisPane.classList.remove("invisible");
      Object.assign(thisPane.style, visibleStyles);
    } else {
      thisPane.classList.add("invisible");
      thisPane.classList.remove("motion-safe:animate-fadeInUp");
      Object.assign(thisPane.style, hiddenStyles);
    }

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
  }, [id, revealResult, withholdResult, ready, heldBeliefsFilter, withheldBeliefsFilter]);
}
