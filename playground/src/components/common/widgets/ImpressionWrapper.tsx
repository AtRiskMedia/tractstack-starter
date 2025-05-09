import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { panesVisible, showImpressions } from "@/store/events";
import { useInterval } from "@/utils/common/useInterval";
import { Impression } from "./Impression";
import { useFloatingOnScroll } from "@/utils/common/useFloatingOnScroll";
import { IMPRESSIONS_DELAY } from "@/constants";
import type { Config, ImpressionDatum } from "@/types";

const ImpressionWrapper = ({
  payload,
  slug,
  isContext,
  config,
  icon = false,
}: {
  payload: ImpressionDatum[];
  slug: string;
  isContext: boolean;
  config: Config;
  icon?: boolean;
}) => {
  const $inView = useStore(panesVisible);
  const $show = useStore(showImpressions);
  const [offset, setOffset] = useState(0);
  const [activeImpressions, setActiveImpressions] = useState<ImpressionDatum[]>([]);
  const [currentImpression, setCurrentImpression] = useState<ImpressionDatum | undefined>(
    undefined
  );

  const headerRef = useRef<HTMLDivElement>(null);

  const { isFloating, opacity } = useFloatingOnScroll(headerRef, {
    offset: 10,
    floatingOpacity: 0.85,
    normalOpacity: 1,
    disabled: !icon,
  });

  useInterval(() => {
    if (activeImpressions.length > offset + 1) {
      setCurrentImpression(activeImpressions[offset]);
      setOffset(offset + 1);
    } else {
      setCurrentImpression(activeImpressions[0]);
      setOffset(0);
    }
  }, IMPRESSIONS_DELAY);

  useEffect(() => {
    const panesWatch = payload.map((p: ImpressionDatum) => p.parentId);
    const start = activeImpressions ? Object.keys(activeImpressions).length : 0;
    const alreadyActive = activeImpressions ? Object.keys(activeImpressions) : [];
    Object.keys($inView).forEach((s: string) => {
      if (!alreadyActive.includes(s) && panesWatch.includes(s)) alreadyActive.push(s);
    });
    if (slug === `storykeep`) alreadyActive.push(`storykeep`);
    if (alreadyActive.length > start) {
      setActiveImpressions(
        payload.filter((i: ImpressionDatum) => alreadyActive?.includes(i.parentId))
      );
      if (offset === 0) {
        setCurrentImpression(
          payload.filter((i: ImpressionDatum) => alreadyActive?.includes(i.parentId)).at(0)
        );
      }
    }
  }, [$inView]);

  if (!icon) {
    if (!currentImpression || !$show) return <aside />;
    return (
      <aside className="mr-1 fixed bottom-16 right-2 w-auto h-auto z-70 h-[calc(var(--scale)*152px)] w-[calc(var(--scale)*540px)] max-h-[152px] max-w-[540px] md:h-[135px] md:w-[480px] overflow-hidden bg-white rounded-md border border-mydarkgrey hover:z-101">
        <button
          type="button"
          className="z-90101 absolute right-2 top-2 rounded-md bg-white text-mylightgrey hover:text-mylightgrey focus:outline-none focus:ring-2 focus:ring-mygreen focus:ring-offset-2"
          onClick={() => showImpressions.set(!$show)}
        >
          <span className="sr-only">Hide impressions</span>
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <Impression payload={currentImpression} slug={slug} isContext={isContext} config={config} />
      </aside>
    );
  }
  if (activeImpressions.length === 0) return <div ref={headerRef} />;

  if ($show) {
    return <div ref={headerRef} />;
  }

  return (
    <div ref={headerRef}>
      <button
        type="button"
        title="Click for notifications"
        className={`h-6 w-6 rounded-full bg-myblue hover:bg-myorange text-white flex justify-center items-center items motion-safe:animate-bounceIn ${
          isFloating ? "fixed top-4 right-4 z-50 transition-all duration-300" : ""
        }`}
        style={{ opacity: isFloating ? opacity : 1 }}
        onMouseEnter={() => isFloating && (document.body.style.cursor = "pointer")}
        onMouseLeave={() => isFloating && (document.body.style.cursor = "auto")}
        onClick={() => showImpressions.set(!$show)}
      >
        <span className="sr-only">Show impressions</span>
        <span>{activeImpressions.length}</span>
      </button>
    </div>
  );
};

export default ImpressionWrapper;
