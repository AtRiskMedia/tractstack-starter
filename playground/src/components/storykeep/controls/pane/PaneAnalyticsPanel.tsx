import { useStore } from "@nanostores/react";
import { useState, useEffect } from "react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import { classNames } from "@/utils/common/helpers";
import { analyticsDuration, showAnalytics, storedAnalytics } from "@/store/storykeep";

const PaneAnalyticsPanel = ({ nodeId }: { nodeId: string }) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $storedAnalytics = useStore(storedAnalytics);
  const duration = $analyticsDuration;
  const [isDataReady, setIsDataReady] = useState(false);

  const data = $storedAnalytics[nodeId] || { pie: [], line: [] };

  useEffect(() => {
    if ($storedAnalytics && nodeId in $storedAnalytics) {
      setIsDataReady(true);
    }
  }, [$storedAnalytics, nodeId]);

  const updateDuration = (newValue: `daily` | `weekly` | `monthly`) => {
    analyticsDuration.set(newValue);
  };

  const toggleAnalytics = () => {
    showAnalytics.set(false);
  };

  if (!isDataReady) {
    return (
      <div className="bg-myblack/90 px-3.5 py-1.5">
        <div className="rounded-xl w-64 bg-mywhite p-3.5">
          <p className="text-mydarkgrey">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mywhite shadow-inner px-3.5 py-1.5 flex flex-wrap items-start">
      <div className="flex gap-4 w-full">
        <div className="px-2 py-1 text-gray-800 text-sm">
          {" "}
          <ArrowUpIcon className="w-6 h-6 inline-block" /> Activity on this Pane
          <div className="inline-flex px-4 gap-2">
            <span className="font-action">Stats for past:</span>
            {["daily", "weekly", "monthly"].map((period) => (
              <button
                key={period}
                onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
                className={classNames(
                  duration === period
                    ? "font-bold text-myblue"
                    : "underline text-mydarkgrey/80 hover:bg-myorange"
                )}
              >
                {period === `daily` ? `24 hours` : period === `weekly` ? `7 days` : `4 weeks`}
              </button>
            ))}
            <button
              onClick={toggleAnalytics}
              className="underline text-mydarkgrey/80 hover:text-myorange"
            >
              hide
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {data.pie.map((verb) => (
            <span key={verb.id} className="px-2 py-1 text-cyan-700 text-sm rounded shadow-inner">
              {verb.id}: {verb.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaneAnalyticsPanel;
