import { useStore } from "@nanostores/react";
import { useState, useEffect } from "react";
import { analyticsDuration, showAnalytics, storedAnalytics } from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";
import ResponsiveLine from "./ResponsiveLine";

interface AnalyticsPanelProps {
  nodeId: string;
}

const AnalyticsPanel = ({ nodeId }: AnalyticsPanelProps) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $storedAnalytics = useStore(storedAnalytics);
  const $showAnalytics = useStore(showAnalytics);
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

  if (!$showAnalytics || !isDataReady) return null;

  return (
    <div className="w-full mb-6 overflow-hidden">
      <div className="rounded-md bg-mywhite mb-4 shadow">
        <div className="p-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-md">
            <span className="font-action">Recent Activity:</span>
            {["daily", "weekly", "monthly"].map((period) => (
              <button
                key={period}
                onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
                className={classNames(
                  duration === period
                    ? "font-bold text-myblue"
                    : "underline text-mydarkgrey/80 hover:text-myorange"
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
      </div>

      <div
        className="overflow-hidden bg-mywhite shadow-inner rounded-xl w-full"
        style={{ height: "300px", maxWidth: "100%", minWidth: "0" }}
      >
        <ResponsiveLine data={data.line} duration={duration} />
      </div>
    </div>
  );
};

export default AnalyticsPanel;
