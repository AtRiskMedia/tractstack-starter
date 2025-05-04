import { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { analyticsStore, analyticsDuration } from "@/store/storykeep.ts";
import ResponsiveLine from "./ResponsiveLine";

const DashboardActivity = () => {
  const [isClient, setIsClient] = useState(false);
  const analytics = useStore(analyticsStore);
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processedData = useMemo(() => {
    if (!analytics.dashboard || !analytics.dashboard.line) {
      return [];
    }
    const processed = analytics.dashboard.line.map((series) => ({
      ...series,
      data: series.data
        .filter((point) => point.x !== null && point.y !== null && point.y !== 0)
        .sort((a, b) => Number(a.x) - Number(b.x)),
    }));
    return processed;
  }, [analytics.dashboard]);

  if (!isClient) return null;

  if (!analytics.dashboard || !analytics.dashboard.line) {
    return <div>Loading activity data...</div>;
  }

  if (processedData.length === 0) return <div />;

  return (
    <>
      <div style={{ height: "400px" }}>
        <ResponsiveLine data={processedData} duration={duration} />
      </div>
    </>
  );
};

export default DashboardActivity;
