import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { panesVisible, showImpressions } from "../store/events";
import { useInterval } from "../utils/useInterval";
import { Impression } from "./Impression";
import type { ImpressionDatum } from "../types";

const ImpressionWrapper = ({
  payload,
  slug,
  isContext,
  icon = false,
}: {
  payload: ImpressionDatum[];
  slug: string;
  isContext: boolean;
  icon?: boolean;
}) => {
  const $inView = useStore(panesVisible);
  const $show = useStore(showImpressions);
  const [offset, setOffset] = useState(0);
  const [activeImpressions, setActiveImpressions] = useState<ImpressionDatum[]>([]);
  const [currentImpression, setCurrentImpression] = useState<ImpressionDatum | undefined>(
    undefined
  );

  useInterval(
    () => {
      if (activeImpressions.length > offset + 1) {
        setCurrentImpression(activeImpressions[offset]);
        setOffset(offset + 1);
      } else {
        setCurrentImpression(activeImpressions[0]);
        setOffset(0);
      }
    },
    import.meta.env.PUBLIC_IMPRESSIONS_DELAY || 22000
  );

  useEffect(() => {
    // these are the panes to watch for from inView
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

  // show as aside
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
        <Impression payload={currentImpression} slug={slug} isContext={isContext} />
      </aside>
    );
  }
  // or if visible impressions length = 0 show nothing
  if (activeImpressions.length === 0) return <div />;
  // else just show icon (for header)
  return (
    <button
      type="button"
      title="Click for notifications"
      className="h-6 w-6 rounded-full bg-myblue/80 hover:bg-myorange/100 text-white flex justify-center items-center items motion-safe:animate-bounceIn"
      onClick={() => showImpressions.set(!$show)}
    >
      <span className="sr-only">Show impressions</span>
      <span>{activeImpressions.length}</span>
    </button>
  );
};

export default ImpressionWrapper;
