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
  const paneRef = useRef<HTMLElement | null>(null);

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

  // Handle visibility and scrolling with SEO-friendly hiding
  useEffect(() => {
    const thisPane = document.querySelector(`#pane-${id}`) as HTMLElement;
    if (!thisPane) {
      console.error(`Pane ${id} not found`);
      return;
    }
    paneRef.current = thisPane;

    const isVisible =
      (heldBeliefsFilter && !withheldBeliefsFilter && reveal) ||
      (!heldBeliefsFilter && withheldBeliefsFilter && overrideWithhold) ||
      (heldBeliefsFilter && withheldBeliefsFilter && reveal && overrideWithhold);

    if (isVisible) {
      // Restore visibility while maintaining SEO friendliness
      thisPane.classList.remove("invisible");
      thisPane.style.opacity = "1";
      thisPane.style.height = "auto";
      thisPane.style.overflow = "visible";
      thisPane.style.clipPath = "none";
      thisPane.style.margin = "";

      const shouldScroll =
        !isFirstRender.current && Date.now() - $pageLoadTime > SCROLL_PREVENTION_PERIOD;

      if (shouldScroll) {
        const viewportHeight = window.innerHeight;
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + viewportHeight;
        const paneTop = thisPane.offsetTop;

        const PROXIMITY_THRESHOLD = viewportHeight;
        if (Math.abs(paneTop - viewportBottom) < PROXIMITY_THRESHOLD) {
          thisPane.classList.add("motion-safe:animate-fadeInUp");

          requestAnimationFrame(() => {
            window.scrollTo({
              top: paneTop - 20,
              behavior: "smooth",
            });
          });
        }
      }
    } else {
      // Hide content while keeping it accessible to search engines
      thisPane.classList.add("invisible");
      thisPane.style.opacity = "0";
      thisPane.style.height = "0";
      thisPane.style.overflow = "hidden";
      thisPane.style.clipPath = "inset(50%)"; // Modern way to visually hide
      thisPane.style.margin = "0";
      thisPane.classList.remove("motion-safe:animate-fadeInUp");
    }

    isFirstRender.current = false;

    // Cleanup function
    return () => {
      if (paneRef.current) {
        paneRef.current.style.opacity = "";
        paneRef.current.style.height = "";
        paneRef.current.style.overflow = "";
        paneRef.current.style.clipPath = "";
        paneRef.current.style.margin = "";
      }
    };
  }, [id, heldBeliefsFilter, withheldBeliefsFilter, reveal, overrideWithhold, $pageLoadTime]);

  return null;
};

export default Filter;
