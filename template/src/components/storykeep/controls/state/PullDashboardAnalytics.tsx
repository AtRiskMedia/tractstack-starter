import { useEffect, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, analyticsStore, epinetCustomFilters } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { debounce } from "@/utils/common/helpers";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $contentMap = useStore(contentMap);
  const duration = $analyticsDuration;

  const pollingAttemptsRef = useRef<number>(0);
  const epinetPollingAttemptsRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const epinetPollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDoneRef = useRef<boolean>(false);
  const customFetchInProgressRef = useRef<boolean>(false);
  const previousEnabledRef = useRef<boolean>(epinetCustomFilters.get().enabled);

  const MAX_POLLING_ATTEMPTS = 6;
  const POLLING_DELAYS = [2000, 3000, 5000, 7000, 10000, 15000];

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (epinetPollingTimerRef.current) {
        clearTimeout(epinetPollingTimerRef.current);
        epinetPollingTimerRef.current = null;
      }
    };
  }, []);

  // Initialize epinet custom filters based on duration
  useEffect(() => {
    let startHour;
    const endHour = 0;

    if (duration === "daily") {
      startHour = 24;
    } else if (duration === "weekly") {
      startHour = 168;
    } else {
      startHour = 672;
    }

    epinetCustomFilters.set({
      enabled: true,
      visitorType: "all",
      selectedUserId: null,
      startHour,
      endHour,
      userCounts: epinetCustomFilters.get().userCounts || [],
      hourlyNodeActivity: epinetCustomFilters.get().hourlyNodeActivity || {},
    });
  }, [duration]);

  // Fetch analytics on duration change
  useEffect(() => {
    pollingAttemptsRef.current = 0;
    fetchAllAnalytics();
  }, [duration]);

  // Initial fetch
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      pollingAttemptsRef.current = 0;
      fetchAllAnalytics();
      initialFetchDoneRef.current = true;
    }
  }, []);

  // Handle custom filter toggle
  useEffect(() => {
    const wasEnabled = previousEnabledRef.current;
    previousEnabledRef.current = epinetCustomFilters.get().enabled;

    if (wasEnabled && !epinetCustomFilters.get().enabled) {
      pollingAttemptsRef.current = 0;
      fetchAllAnalytics();
    }
  }, [epinetCustomFilters]);

  // Handle custom filter changes
  useEffect(() => {
    if (!epinetCustomFilters.get().enabled) return;
    if (!$contentMap || $contentMap.length === 0) return;

    const hasValidFilters =
      epinetCustomFilters.get().visitorType !== null &&
      epinetCustomFilters.get().startHour !== null &&
      epinetCustomFilters.get().endHour !== null;

    if (hasValidFilters) {
      debouncedFetchCustomEpinetData();
    }
  }, [
    epinetCustomFilters.get().enabled,
    epinetCustomFilters.get().visitorType,
    epinetCustomFilters.get().selectedUserId,
    epinetCustomFilters.get().startHour,
    epinetCustomFilters.get().endHour,
    $contentMap,
  ]);

  const fetchAllAnalytics = useCallback(async () => {
    try {
      analyticsStore.setKey("isLoading", true);

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }

      const response = await fetch(`/api/turso/getAllAnalytics?duration=${duration}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        analyticsStore.setKey("dashboard", result.data.dashboard);
        analyticsStore.setKey("leads", result.data.leads);
        analyticsStore.setKey("status", result.status);
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);

        if (result.status === "loading" || result.status === "refreshing") {
          if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
            const delayMs =
              POLLING_DELAYS[pollingAttemptsRef.current] ||
              POLLING_DELAYS[POLLING_DELAYS.length - 1];
            pollingAttemptsRef.current += 1;
            pollingTimerRef.current = setTimeout(() => {
              fetchAllAnalytics();
            }, delayMs);
          } else {
            analyticsStore.setKey("status", "complete");
            pollingAttemptsRef.current = 0;
          }
        } else {
          pollingAttemptsRef.current = 0;
        }
      } else {
        analyticsStore.setKey("error", result.error || "Unknown API error");
        analyticsStore.setKey("status", "error");

        if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
          const delayMs =
            POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
          pollingAttemptsRef.current += 1;
          pollingTimerRef.current = setTimeout(() => {
            fetchAllAnalytics();
          }, delayMs);
        } else {
          analyticsStore.setKey("status", "error");
          pollingAttemptsRef.current = 0;
        }
      }
    } catch (error) {
      console.error("fetchAllAnalytics error:", error);
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
        const delayMs =
          POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
        pollingAttemptsRef.current += 1;
        pollingTimerRef.current = setTimeout(() => {
          fetchAllAnalytics();
        }, delayMs);
      } else {
        pollingAttemptsRef.current = 0;
      }
    } finally {
      analyticsStore.setKey("isLoading", false);
    }
  }, [duration]);

  const fetchCustomEpinetData = useCallback(async (epinetId: string) => {
    if (customFetchInProgressRef.current) {
      return;
    }

    try {
      customFetchInProgressRef.current = true;

      if (epinetPollingTimerRef.current) {
        clearTimeout(epinetPollingTimerRef.current);
        epinetPollingTimerRef.current = null;
      }

      const url = new URL(`/api/turso/getEpinetCustomMetrics`, window.location.origin);
      url.searchParams.append("id", epinetId);
      url.searchParams.append("visitorType", epinetCustomFilters.get().visitorType);
      const userId = epinetCustomFilters.get().selectedUserId;
      if (userId) {
        url.searchParams.append("userId", userId);
      }
      const startHour = epinetCustomFilters.get().startHour;
      if (startHour !== null) {
        url.searchParams.append("startHour", startHour.toString());
      }
      const endHour = epinetCustomFilters.get().endHour;
      if (endHour !== null) {
        url.searchParams.append("endHour", endHour.toString());
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Custom epinet metrics request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        analyticsStore.setKey("epinet", result.data.epinet);
        epinetCustomFilters.set({
          ...epinetCustomFilters.get(),
          userCounts: result.data.userCounts || [],
          hourlyNodeActivity: result.data.hourlyNodeActivity || {},
        });

        if (result.status === "loading" || result.status === "refreshing") {
          if (epinetPollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
            const delayMs =
              POLLING_DELAYS[epinetPollingAttemptsRef.current] ||
              POLLING_DELAYS[POLLING_DELAYS.length - 1];
            epinetPollingAttemptsRef.current += 1;
            epinetPollingTimerRef.current = setTimeout(() => {
              fetchCustomEpinetData(epinetId);
            }, delayMs);
          } else {
            epinetPollingAttemptsRef.current = 0;
            // Ensure analyticsStore reflects that epinet data fetch is done
          }
        } else {
          epinetPollingAttemptsRef.current = 0;
        }
      }
    } catch (error) {
      console.error("fetchCustomEpinetData error:", error);
    } finally {
      customFetchInProgressRef.current = false;
    }
  }, []);

  const debouncedFetchCustomEpinetData = useCallback(
    debounce(() => {
      const epinets = ($contentMap || []).filter(
        (item) => (item as any).type === "Epinet" && (item as any).promoted
      );
      const epinetId = epinets.length > 0 ? epinets[0].id : null;

      if (epinetId) {
        fetchCustomEpinetData(epinetId);
      }
    }, 500),
    [fetchCustomEpinetData, $contentMap]
  );

  return null;
};

export default PullDashboardAnalytics;
