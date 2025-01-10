import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { storedAnalytics, analyticsDuration } from "@/store/storykeep";
import type { AnalyticsItem, PieDataItem, LineDataSeries, Analytics } from "@/types.ts";

type PullAnalyticsProps = {
  id: string;
  type?: "pane" | "storyfragment";
};

const PullAnalytics = ({ id, type = `storyfragment` }: PullAnalyticsProps) => {
  const $analyticsDuration = useStore(analyticsDuration);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (id === "create") return;

        const response = await fetch("/api/turso/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            type,
            duration: $analyticsDuration,
          }),
        });

        const result = await response.json();

        if (result.success) {
          const analyticsMap: Analytics = {};
          result.data.pie.forEach((item: AnalyticsItem) => {
            analyticsMap[item.object_id] = {
              ...analyticsMap[item.object_id],
              pie: item.verbs as PieDataItem[],
            };
          });
          result.data.line.forEach((item: AnalyticsItem) => {
            analyticsMap[item.object_id] = {
              ...analyticsMap[item.object_id],
              line: item.verbs as LineDataSeries[],
            };
          });
          storedAnalytics.set(analyticsMap);
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    };

    fetchAnalytics();
  }, [id, type, $analyticsDuration]);

  return null;
};

export default PullAnalytics;
