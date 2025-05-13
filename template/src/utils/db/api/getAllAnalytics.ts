import {
  formatHourKey,
  hourlyAnalyticsStore,
  isAnalyticsCacheValid,
  createEmptyLeadMetrics,
} from "@/store/analytics";
import { loadHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader";
import {
  computeDashboardAnalytics,
  createEmptyDashboardAnalytics,
} from "@/utils/events/dashboardAnalytics";
import { computeLeadMetrics } from "@/utils/events/analyticsComputation";
import type { APIContext } from "@/types";

/**
 * Get all analytics data including dashboard metrics and lead metrics
 * Handles cache validation and background loading
 */
export async function getAllAnalytics(durationParam: string = "weekly", context?: APIContext) {
  const duration = ["daily", "weekly", "monthly"].includes(durationParam)
    ? (durationParam as "daily" | "weekly" | "monthly")
    : "weekly";

  try {
    const tenantId = context?.locals?.tenant?.id || "default";
    const isAnalyticsValid = isAnalyticsCacheValid(tenantId);
    const analyticStore = hourlyAnalyticsStore.get();
    const currentHour = formatHourKey(
      new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      )
    );
    const tenantAnalyticsData = analyticStore.data[tenantId];

    if (
      isAnalyticsValid &&
      tenantAnalyticsData &&
      tenantAnalyticsData.lastFullHour === currentHour
    ) {
      const [dashboardData, leadMetrics] = await Promise.all([
        computeDashboardAnalytics(duration, context),
        computeLeadMetrics(context),
      ]);
      return {
        dashboard: dashboardData,
        leads: leadMetrics,
        status: "complete",
      };
    }

    // Refresh data in the background if needed
    const needsAnalyticsRefresh =
      !isAnalyticsValid || !tenantAnalyticsData || tenantAnalyticsData.lastFullHour !== currentHour;

    const hoursToLoad =
      tenantAnalyticsData && Object.keys(tenantAnalyticsData.contentData).length > 0 ? 1 : 672;

    // Start background processing
    const processingPromises = [];

    if (needsAnalyticsRefresh) {
      processingPromises.push(
        loadHourlyAnalytics(hoursToLoad, context).catch((err) =>
          console.error("Async analytics processing error:", err)
        )
      );
    }

    // Start processing in background
    Promise.all(processingPromises).catch((err) =>
      console.error("Error in background processing:", err)
    );

    const [dashboardData, leadMetrics] = await Promise.all([
      tenantAnalyticsData
        ? computeDashboardAnalytics(duration, context)
        : createEmptyDashboardAnalytics(),
      tenantAnalyticsData ? computeLeadMetrics(context) : createEmptyLeadMetrics(),
    ]);

    const status = needsAnalyticsRefresh ? "refreshing" : "complete";

    return {
      dashboard: dashboardData,
      leads: leadMetrics,
      status: status,
    };
  } catch (error) {
    console.error("Error in getAllAnalytics:", error);
    throw error;
  }
}
