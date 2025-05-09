import {
  formatHourKey,
  hourlyAnalyticsStore,
  hourlyEpinetStore,
  isAnalyticsCacheValid,
  isEpinetCacheValid,
  createEmptyLeadMetrics,
} from "@/store/analytics";
import { getFullContentMap } from "@/utils/db/turso";
import { loadHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader";
import { loadHourlyEpinetData } from "@/utils/events/epinetLoader";
import {
  computeDashboardAnalytics,
  createEmptyDashboardAnalytics,
} from "@/utils/events/dashboardAnalytics";
import { computeLeadMetrics } from "@/utils/events/analyticsComputation";
import { getEpinetMetrics } from "@/utils/events/epinetAnalytics";
import type { APIContext } from "@/types";

/**
 * Get all analytics data including dashboard metrics, lead metrics, and epinet data
 * Handles cache validation and background loading
 */
export async function getAllAnalytics(durationParam: string = "weekly", context?: APIContext) {
  const duration = ["daily", "weekly", "monthly"].includes(durationParam)
    ? (durationParam as "daily" | "weekly" | "monthly")
    : "weekly";

  try {
    const tenantId = context?.locals?.tenant?.id || "default";
    const isAnalyticsValid = isAnalyticsCacheValid(tenantId);
    const isEpinetValid = isEpinetCacheValid(tenantId);
    const analyticStore = hourlyAnalyticsStore.get();
    const epinetStore = hourlyEpinetStore.get();
    const currentHour = formatHourKey(new Date());
    const tenantAnalyticsData = analyticStore.data[tenantId];
    const tenantEpinetData = epinetStore.data[tenantId];

    // Find the first promoted epinet ID for epinet data
    const contentItems = await getFullContentMap(context);
    const epinets = contentItems.filter((item: any) => item.type === "Epinet" && item.promoted);
    const epinetId = epinets.length > 0 ? epinets[0].id : null;

    // Check if all data is fresh and complete
    if (
      isAnalyticsValid &&
      tenantAnalyticsData &&
      tenantAnalyticsData.lastFullHour === currentHour &&
      isEpinetValid &&
      epinetId &&
      tenantEpinetData &&
      tenantEpinetData[epinetId] &&
      epinetStore.lastFullHour[tenantId] === currentHour
    ) {
      // All data is fresh
      const [dashboardData, leadMetrics, epinetData] = await Promise.all([
        computeDashboardAnalytics(duration, context),
        computeLeadMetrics(context),
        epinetId ? getEpinetMetrics(epinetId, duration, context) : null,
      ]);

      return {
        dashboard: dashboardData,
        leads: leadMetrics,
        epinet: epinetData,
        status: "complete",
      };
    }

    // Refresh data in the background if needed
    const needsAnalyticsRefresh =
      !isAnalyticsValid || !tenantAnalyticsData || tenantAnalyticsData.lastFullHour !== currentHour;

    const needsEpinetRefresh =
      !isEpinetValid ||
      !tenantEpinetData ||
      !epinetId ||
      !tenantEpinetData[epinetId] ||
      epinetStore.lastFullHour[tenantId] !== currentHour;

    const hoursToLoad =
      tenantAnalyticsData && Object.keys(tenantAnalyticsData.contentData).length > 0 ? 1 : 672;
    const epinetHoursToLoad = tenantEpinetData && Object.keys(tenantEpinetData).length > 0;

    // Start background processing
    const processingPromises = [];

    if (needsAnalyticsRefresh) {
      processingPromises.push(
        loadHourlyAnalytics(hoursToLoad, context).catch((err) =>
          console.error("Async analytics processing error:", err)
        )
      );
    }

    if (needsEpinetRefresh && epinetId) {
      processingPromises.push(
        loadHourlyEpinetData(672, context, epinetHoursToLoad).catch((err) =>
          console.error("Async epinet processing error:", err)
        )
      );
    }

    // Start processing in background
    Promise.all(processingPromises).catch((err) =>
      console.error("Error in background processing:", err)
    );

    const [dashboardData, leadMetrics, epinetData] = await Promise.all([
      tenantAnalyticsData
        ? computeDashboardAnalytics(duration, context)
        : createEmptyDashboardAnalytics(),
      tenantAnalyticsData ? computeLeadMetrics(context) : createEmptyLeadMetrics(),
      epinetId && tenantEpinetData && tenantEpinetData[epinetId]
        ? getEpinetMetrics(epinetId, duration, context)
        : {
            id: epinetId || "unknown",
            title: "User Journey Flow (Loading...)",
            nodes: [],
            links: [],
          },
    ]);

    const status = needsAnalyticsRefresh || needsEpinetRefresh ? "refreshing" : "complete";

    return {
      dashboard: dashboardData,
      leads: leadMetrics,
      epinet: epinetData,
      status: status,
    };
  } catch (error) {
    console.error("Error in getAllAnalytics:", error);
    throw error;
  }
}
