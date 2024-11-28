import { useEffect, useState, useRef } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefs } from "../store/beliefs";
import { pageLoadTime } from "../store/events";
import type { BeliefStore, BeliefDatum } from "../types";

const SCROLL_PREVENTION_PERIOD = 5000;

const Filter = (props: {
  id: string;
  heldBeliefsFilter: BeliefDatum;
  withheldBeliefsFilter: BeliefDatum;
}) => {
  const { id, heldBeliefsFilter, withheldBeliefsFilter } = props;
  const $heldBeliefsAll = useStore(heldBeliefs);
  const $pageLoadTime = useStore(pageLoadTime);
  const [reveal, setReveal] = useState(false);
  const [overrideWithhold, setOverrideWithhold] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // must match for all heldBeliefs
    // - setReveal true on match
    if (heldBeliefsFilter && Object.keys(heldBeliefsFilter)?.length) {
      let match = false;
      let all = true;
      Object.entries(heldBeliefsFilter).forEach(([key, value]) => {
        if (typeof value === `string`) {
          const thisMatchingBelief = $heldBeliefsAll
            .filter(
              (m: BeliefStore) =>
                m.slug === key && (m.verb === value || value === `*` || m?.object === value)
            )
            .at(0);
          if (thisMatchingBelief) match = true;
          else all = false;
        } else {
          Object.values(value).forEach((v) => {
            const thisMatchingBelief = $heldBeliefsAll
              .filter(
                (m: BeliefStore) =>
                  (m.slug === key && m.verb === v) ||
                  (m.slug === key && m?.object === v) ||
                  (m.slug === key && v === `*`)
              )
              .at(0);
            if (thisMatchingBelief) match = true;
            else all = false;
          });
        }
      });
      if (match && all) {
        setReveal(true);
      } else setReveal(false);
    } else setReveal(true);

    // must match for all withheldBeliefs
    // - setWithhold false on match
    if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter)?.length) {
      let withhold = true;
      Object.entries(withheldBeliefsFilter).forEach(([key, value]) => {
        if (typeof value === `string`) {
          const thisMatchingBelief = $heldBeliefsAll
            .filter(
              (m: BeliefStore) =>
                m.slug === key && (m.verb === value || value === `*` || m?.object === value)
            )
            .at(0);
          if (thisMatchingBelief) withhold = false;
        } else {
          Object.values(value).forEach((v) => {
            const thisMatchingBelief = $heldBeliefsAll
              .filter(
                (m: BeliefStore) =>
                  (m.slug === key && m.verb === v) ||
                  (m.slug === key && m?.object === v) ||
                  (m.slug === key && v === `*`)
              )
              .at(0);
            if (thisMatchingBelief) withhold = false;
          });
        }
      });
      if (withhold) setOverrideWithhold(true);
      else setOverrideWithhold(false);
    } else setOverrideWithhold(true);
  }, [$heldBeliefsAll, heldBeliefsFilter, withheldBeliefsFilter]);

  // Filter.tsx - just the key scroll handling part
  useEffect(() => {
    const thisPane = document.querySelector(`#pane-${id}`) as HTMLElement;
    if (!thisPane) {
      console.log(`Pane ${id} not found`);
      return;
    }

    const isVisible =
      (heldBeliefsFilter && !withheldBeliefsFilter && reveal) ||
      (!heldBeliefsFilter && withheldBeliefsFilter && overrideWithhold) ||
      (heldBeliefsFilter && withheldBeliefsFilter && reveal && overrideWithhold);

    if (isVisible) {
      thisPane.classList.remove(`invisible`, `h-0`);

      // Only scroll if:
      // 1. This isn't the first render
      // 2. We're outside the scroll prevention period
      // 3. The pane is adjacent to the user's viewport
      const shouldScroll =
        !isFirstRender.current && Date.now() - $pageLoadTime > SCROLL_PREVENTION_PERIOD;

      if (shouldScroll) {
        // Get viewport bounds
        const viewportHeight = window.innerHeight;
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + viewportHeight;
        const paneTop = thisPane.offsetTop;

        // Only scroll if this pane is near the viewport
        const PROXIMITY_THRESHOLD = viewportHeight * 1.5; // Adjust as needed
        if (Math.abs(paneTop - viewportBottom) < PROXIMITY_THRESHOLD) {
          thisPane.classList.add(`motion-safe:animate-fadeInUp`);
          void thisPane.offsetHeight;

          window.scrollTo({
            top: paneTop - 20,
            behavior: "smooth",
          });
        }
      }
    } else {
      thisPane.classList.remove(`motion-safe:animate-fadeInUp`);
      thisPane.classList.add(`invisible`, `h-0`);
    }
    isFirstRender.current = false;
  }, [id, heldBeliefsFilter, withheldBeliefsFilter, reveal, overrideWithhold, $pageLoadTime]);

  return null;
};

export default Filter;
