import { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics, analyticsDuration } from "@/store/storykeep.ts";
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
    </>
  );
};

export default DashboardActivity;
