import {
  hourlyEpinetStore,
  getHourKeysForTimeRange,
  createEmptyLeadMetrics,
  isEpinetCacheValid,
  isKnownFingerprint,
  knownFingerprintsStore,
} from "@/store/analytics";
import { loadKnownFingerprints } from "@/utils/events/epinetAnalytics";
import { loadHourlyEpinetData, getEpinetLoadingStatus } from "@/utils/events/epinetLoader";
import type { LeadMetrics, APIContext } from "@/types";

const computationState: Record<
  string,
  {
    leadMetricsLastComputed: number;
    pendingComputations: boolean;
  }
> = {};

const COMPUTATION_THROTTLE_MS = 5000;

export async function computeLeadMetrics(
  context?: APIContext
): Promise<LeadMetrics & { status?: string }> {
  const tenantId = context?.locals?.tenant?.id || "default";
  await loadKnownFingerprints(context);

  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      leadMetricsLastComputed: 0,
      pendingComputations: false,
    };
  }

  const isValid = isEpinetCacheValid(tenantId);
  const now = Date.now();
  const loadingStatus = getEpinetLoadingStatus(tenantId);

  if (
    loadingStatus.loading &&
    now - computationState[tenantId].leadMetricsLastComputed < COMPUTATION_THROTTLE_MS
  ) {
    return {
      ...createEmptyLeadMetrics(),
      status: "loading",
    };
  }

  if (!isValid && !loadingStatus.loading) {
    computationState[tenantId].pendingComputations = true;

    const loadingPromise = loadHourlyEpinetData(context).catch((error) => {
      console.error("Error loading epinet data for lead metrics:", error);
    });

    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations = false;
    });

    return {
      ...createEmptyLeadMetrics(),
      status: "loading",
    };
  }

  try {
    computationState[tenantId].leadMetricsLastComputed = now;

    const epinetStore = hourlyEpinetStore.get();
    const tenantData = epinetStore.data[tenantId];

    if (!tenantData || Object.keys(tenantData).length === 0) {
      if (loadingStatus.loading || computationState[tenantId].pendingComputations) {
        return {
          ...createEmptyLeadMetrics(),
          status: "loading",
        };
      }
      return createEmptyLeadMetrics();
    }

    const hours24 = getHourKeysForTimeRange(24);
    const hours7d = getHourKeysForTimeRange(168);
    const hours28d = getHourKeysForTimeRange(672);

    const metrics24h = aggregateHourlyVisitorMetrics(tenantData, hours24, context);
    const metrics7d = aggregateHourlyVisitorMetrics(tenantData, hours7d, context);
    const metrics28d = aggregateHourlyVisitorMetrics(tenantData, hours28d, context);

    const allHours = new Set<string>();
    Object.values(tenantData).forEach((epinetData) => {
      Object.keys(epinetData).forEach((hourKey) => allHours.add(hourKey));
    });

    const totalMetrics = aggregateHourlyVisitorMetrics(tenantData, Array.from(allHours), context);

    const total24h = metrics24h.anonymousVisitors.size + metrics24h.knownVisitors.size;
    const total7d = metrics7d.anonymousVisitors.size + metrics7d.knownVisitors.size;
    const total28d = metrics28d.anonymousVisitors.size + metrics28d.knownVisitors.size;
    const knownFingerprints = knownFingerprintsStore.get();
    const totalLeads = knownFingerprints.data[tenantId]?.size || 0;

    const first_time_24h_percentage =
      total24h > 0 ? (metrics24h.anonymousVisitors.size / total24h) * 100 : 0;
    const returning_24h_percentage =
      total24h > 0 ? (metrics24h.knownVisitors.size / total24h) * 100 : 0;
    const first_time_7d_percentage =
      total7d > 0 ? (metrics7d.anonymousVisitors.size / total7d) * 100 : 0;
    const returning_7d_percentage =
      total7d > 0 ? (metrics7d.knownVisitors.size / total7d) * 100 : 0;
    const first_time_28d_percentage =
      total28d > 0 ? (metrics28d.anonymousVisitors.size / total28d) * 100 : 0;
    const returning_28d_percentage =
      total28d > 0 ? (metrics28d.knownVisitors.size / total28d) * 100 : 0;

    const last_activity = epinetStore.lastUpdateTime[tenantId]
      ? new Date(epinetStore.lastUpdateTime[tenantId]).toISOString()
      : "";

    return {
      total_visits: totalMetrics.totalVisitors,
      last_activity,
      first_time_24h: metrics24h.anonymousVisitors.size,
      returning_24h: metrics24h.knownVisitors.size,
      first_time_7d: metrics7d.anonymousVisitors.size,
      returning_7d: metrics7d.knownVisitors.size,
      first_time_28d: metrics28d.anonymousVisitors.size,
      returning_28d: metrics28d.knownVisitors.size,
      first_time_24h_percentage,
      returning_24h_percentage,
      first_time_7d_percentage,
      returning_7d_percentage,
      first_time_28d_percentage,
      returning_28d_percentage,
      total_leads: totalLeads,
      status: loadingStatus.loading ? "loading" : "complete",
    };
  } catch (error) {
    console.error("Error computing lead metrics from epinet data:", error);
    return {
      ...createEmptyLeadMetrics(),
      status: "error",
    };
  }
}

function aggregateHourlyVisitorMetrics(
  tenantData: Record<string, Record<string, Record<string, any>>>,
  hourKeys: string[],
  context?: APIContext
) {
  const anonymousVisitors = new Set<string>();
  const knownVisitors = new Set<string>();
  let totalVisits = 0;
  const eventCounts: Record<string, number> = {};
  const tenantId = context?.locals?.tenant?.id || "default";

  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    hourKeys.forEach((hourKey) => {
      if (!epinetData[hourKey]) return;

      for (const stepId in epinetData[hourKey].steps) {
        const step = epinetData[hourKey].steps[stepId];
        const eventType = extractEventType(stepId);

        if (eventType) {
          eventCounts[eventType] = (eventCounts[eventType] || 0) + step.visitors.size;
        }

        step.visitors.forEach((visitorId: string) => {
          if (isKnownFingerprint(visitorId, tenantId)) {
            knownVisitors.add(visitorId);
          } else {
            anonymousVisitors.add(visitorId);
          }

          totalVisits++;
        });
      }
    });
  }

  return {
    anonymousVisitors,
    knownVisitors,
    totalVisitors: anonymousVisitors.size + knownVisitors.size,
    totalVisits,
    eventCounts,
  };
}

function extractEventType(stepId: string): string | null {
  const parts = stepId.split("-");

  if (parts[0] === "belief") {
    return parts[1];
  } else if (parts[0] === "identifyAs") {
    return "IDENTIFY_AS";
  } else if (parts[0] === "commitmentAction" || parts[0] === "conversionAction") {
    return parts[2];
  }

  return null;
}

export function isLeadMetricsComputationPending(context?: APIContext): boolean {
  const tenantId = context?.locals?.tenant?.id || "default";

  if (!computationState[tenantId]) {
    return false;
  }

  return computationState[tenantId].pendingComputations;
}

export function triggerLeadMetricsRefresh(context?: APIContext): void {
  const tenantId = context?.locals?.tenant?.id || "default";

  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      leadMetricsLastComputed: 0,
      pendingComputations: false,
    };
  }

  if (!computationState[tenantId].pendingComputations) {
    computationState[tenantId].pendingComputations = true;

    const loadingPromise = loadHourlyEpinetData(context).catch((error) => {
      console.error("Error refreshing epinet data for lead metrics:", error);
    });

    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations = false;
    });
  }
}
