import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefs } from "../../../store/beliefs";
import { pageLoadTime } from "../../../store/events";
import type { BeliefStore, BeliefDatum } from "../../../types";

const SCROLL_PREVENTION_PERIOD = 5000;
const DOM_UPDATE_DELAY = 50;

export const useFilterPane = (
  id: string,
  heldBeliefsFilter: BeliefDatum,
  withheldBeliefsFilter: BeliefDatum
) => {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const $pageLoadTime = useStore(pageLoadTime);
  const [reveal, setReveal] = useState(false);
  const [overrideWithhold, setOverrideWithhold] = useState(false);
  const isFirstRender = useRef(true);
  const paneRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const evaluateBeliefs = () => {
    if (heldBeliefsFilter && Object.keys(heldBeliefsFilter)?.length) {
      let match = false;
      let all = true;

      Object.entries(heldBeliefsFilter).forEach(([key, value]) => {
        if (typeof value === "string") {
          const thisMatchingBelief = $heldBeliefsAll.find(
            (m: BeliefStore) =>
              m.slug === key && (m.verb === value || value === "*" || m?.object === value)
          );
          if (thisMatchingBelief) match = true;
          else all = false;
        } else {
          Object.values(value).forEach((v) => {
            const thisMatchingBelief = $heldBeliefsAll.find(
              (m: BeliefStore) =>
                (m.slug === key && m.verb === v) ||
                (m.slug === key && m?.object === v) ||
                (m.slug === key && v === "*")
            );
            if (thisMatchingBelief) match = true;
            else all = false;
          });
        }
      });

      setReveal(match && all);
    } else {
      setReveal(true);
    }

    if (withheldBeliefsFilter && Object.keys(withheldBeliefsFilter)?.length) {
      let withhold = true;

      Object.entries(withheldBeliefsFilter).forEach(([key, value]) => {
        if (typeof value === "string") {
          const thisMatchingBelief = $heldBeliefsAll.find(
            (m: BeliefStore) =>
              m.slug === key && (m.verb === value || value === "*" || m?.object === value)
          );
          if (thisMatchingBelief) withhold = false;
        } else {
          Object.values(value).forEach((v) => {
            const thisMatchingBelief = $heldBeliefsAll.find(
              (m: BeliefStore) =>
                (m.slug === key && m.verb === v) ||
                (m.slug === key && m?.object === v) ||
                (m.slug === key && v === "*")
            );
            if (thisMatchingBelief) withhold = false;
          });
        }
      });

      setOverrideWithhold(!withhold);
    } else {
      setOverrideWithhold(true);
    }
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

  const handleScroll = (thisPane: HTMLElement) => {
    const viewportHeight = window.innerHeight;
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + viewportHeight;
    const paneTop = thisPane.offsetTop;
    const PROXIMITY_THRESHOLD = viewportHeight;

    if (Math.abs(paneTop - viewportBottom) < PROXIMITY_THRESHOLD) {
      thisPane.classList.add("motion-safe:animate-fadeInUp");

      window.scrollTo({
        top: paneTop - 20,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    evaluateBeliefs();
  }, [$heldBeliefsAll, heldBeliefsFilter, withheldBeliefsFilter]);

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

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    updatePaneVisibility(thisPane, isVisible);

    if (
      isVisible &&
      !isFirstRender.current &&
      Date.now() - $pageLoadTime > SCROLL_PREVENTION_PERIOD
    ) {
      scrollTimeoutRef.current = setTimeout(() => {
        handleScroll(thisPane);
      }, DOM_UPDATE_DELAY);
    }

    isFirstRender.current = false;

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [id, reveal, overrideWithhold, $pageLoadTime]);
};
