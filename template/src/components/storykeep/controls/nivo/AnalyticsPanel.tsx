import { useStore } from "@nanostores/react";
import { useState, useEffect } from "react";
import { analyticsDuration, showAnalytics, storedAnalytics } from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";
import { getCtx } from "@/store/nodes";
import Pie from "./Pie";
import Line from "./Line";

interface AnalyticsPanelProps {
  nodeId: string;
}

const AnalyticsPanel = ({ nodeId }: AnalyticsPanelProps) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $storedAnalytics = useStore(storedAnalytics);
  const duration = $analyticsDuration;
  const [isDataReady, setIsDataReady] = useState(false);

  // Get node data from context
  const ctx = getCtx();
  const node = ctx.allNodes.get().get(nodeId);
  const title = node && `title` in node && typeof node.title === `string` ? node.title : "Unnamed";
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
    <div
      className="bg-myblack/90 px-3.5 py-1.5 flex flex-wrap items-start"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
      }}
    >
      <div className="rounded-xl w-64 flex-shrink-0 text-pretty bg-mywhite h-fit mr-4 mb-4 shadow">
        <div className="p-3.5 text-xl space-y-4">
          <span>{title}</span>
          <div className="flex flex-wrap gap-x-2 text-md">
            <span className="font-action">Stats for past:</span>
            {["daily", "weekly", "monthly"].map((period) => (
              <button
                key={period}
                onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
                className={classNames(
                  duration === period ? "font-bold" : "underline",
                  "text-mydarkgrey/80 hover:text-myorange"
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
      {data?.pie?.length > 0 && (
        <div
          className="rounded-xl bg-mywhite shadow-inner flex-shrink-0 mr-4 mb-4"
          style={{ width: "400px", height: "200px" }}
        >
          <Pie data={data.pie} />
        </div>
      )}
      {data?.line?.length > 0 && (
        <div
          className="rounded-xl bg-mywhite shadow-inner flex-grow mb-4"
          style={{ minWidth: "400px", height: "256px" }}
        >
          <Line data={data.line} duration={duration} />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
