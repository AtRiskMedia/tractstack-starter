import { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics, analyticsDuration } from "@/store/storykeep.ts";
import { classNames } from "@/utils/common/helpers.ts";
import ResponsiveLine from "./ResponsiveLine";

const DashboardActivity = () => {
  const [isClient, setIsClient] = useState(false);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processedData = useMemo(() => {
    if (!$storedDashboardAnalytics || !$storedDashboardAnalytics.line) {
      return [];
    }
    const processed = $storedDashboardAnalytics.line.map((series) => ({
      ...series,
      data: series.data
        .filter((point) => point.x !== null && point.y !== null && point.y !== 0)
        .sort((a, b) => Number(a.x) - Number(b.x)),
    }));
    return processed;
  }, [$storedDashboardAnalytics]);

  const updateDuration = (newValue: "daily" | "weekly" | "monthly") => {
    analyticsDuration.set(newValue);
  };

  if (!isClient) return null;

  if (!$storedDashboardAnalytics || !$storedDashboardAnalytics.line) {
    return <div>Loading activity data...</div>;
  }

  if (processedData.length === 0) return <div />;

  return (
    <>
      <div style={{ height: "400px" }}>
        <ResponsiveLine data={processedData} duration={duration} />
      </div>
      <div className="flex flex-wrap gap-x-2 text-md mt-4">
        <span className="font-action">Stats for past:</span>
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
            {period === "daily" ? "24 hours" : period === "weekly" ? "7 days" : "4 weeks"}
          </button>
        ))}
      </div>
    </>
  );
};

export default DashboardActivity;
