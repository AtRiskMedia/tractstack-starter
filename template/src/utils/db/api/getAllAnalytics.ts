import { isEpinetCacheValid, createEmptyLeadMetrics } from "@/store/analytics";
import { loadHourlyEpinetData } from "@/utils/events/epinetLoader";
import {
  computeDashboardAnalytics,
  createEmptyDashboardAnalytics,
} from "@/utils/events/dashboardAnalytics";
import { computeLeadMetrics } from "@/utils/events/leadMetrics";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import type { APIContext } from "@/types";

/**
 * Get all analytics data including dashboard metrics and lead metrics
 * Handles cache validation and background loading for both analytics and epinet data
 */
export async function getAllAnalytics(durationParam: string = "weekly", context?: APIContext) {
  const duration = ["daily", "weekly", "monthly"].includes(durationParam)
    ? (durationParam as "daily" | "weekly" | "monthly")
    : "weekly";

  try {
    const tenantId = context?.locals?.tenant?.id || "default";
    const isEpinetValid = isEpinetCacheValid(tenantId);
    if (isEpinetValid) {
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

    // Determine if we need to refresh epinet data
    const needsEpinetRefresh = !isEpinetValid;
    // Start background processing
    const processingPromises = [];

    if (needsEpinetRefresh) {
      processingPromises.push(
        loadHourlyEpinetData(MAX_ANALYTICS_HOURS, context).catch((err) =>
          console.error("Async epinet processing error:", err)
        )
      );
    }

    // Start processing in background
    Promise.all(processingPromises).catch((err) =>
      console.error("Error in background processing:", err)
    );

    // Use whatever data we have available now
    const [dashboardData, leadMetrics] = await Promise.all([
      isEpinetValid
        ? computeDashboardAnalytics(duration, context)
        : createEmptyDashboardAnalytics(),
      isEpinetValid ? computeLeadMetrics(context) : createEmptyLeadMetrics(),
    ]);

    // Set status based on what needs refreshing
    const status = needsEpinetRefresh ? "refreshing" : "complete";

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
