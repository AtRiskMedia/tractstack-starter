import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, analyticsStore, epinetCustomFilters } from "@/store/storykeep";
import SankeyDiagram from "@/components/storykeep/controls/d3/SankeyDiagram";
import EpinetDurationSelector from "@/components/storykeep/controls/dashboard/EpinetDurationSelector";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

const ErrorBoundary = ({ children, fallback }: ErrorBoundaryProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) return <>{fallback}</>;

  return <div onError={handleError}>{children}</div>;
};

interface EpinetWrapperProps {
  epinetId?: string;
  title?: string;
  showFilters?: boolean;
}

const EpinetWrapper = ({
  epinetId,
  title = "User Journey Flow",
  showFilters = true,
}: EpinetWrapperProps) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const analytics = useStore(analyticsStore);
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);

  const MAX_POLLING_ATTEMPTS = 3;
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Initialize epinet custom filters based on duration
  useEffect(() => {
    let startHour;
    const endHour = 0; // Current hour

    if ($analyticsDuration === "daily") {
      startHour = 24;
    } else if ($analyticsDuration === "weekly") {
      startHour = 168;
    } else {
      // monthly
      startHour = 672;
    }

    // Always enable custom filters with the appropriate hours
    epinetCustomFilters.set({
      enabled: true,
      visitorType: "all",
      selectedUserId: null,
      startHour,
      endHour,
      userCounts: $epinetCustomFilters.userCounts || [],
      hourlyNodeActivity: $epinetCustomFilters.hourlyNodeActivity || {},
    });
  }, [$analyticsDuration]);

  // Fetch data when duration changes
  useEffect(() => {
    setPollingAttempts(0);
    fetchEpinetData();
  }, [$analyticsDuration]);

  // Fetch data on initial mount
  useEffect(() => {
    fetchEpinetData();
  }, []);

  const fetchEpinetData = useCallback(async () => {
    try {
      analyticsStore.setKey("isLoading", true);

      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

      // Build the URL - if epinetId is provided, use it, otherwise let server find it
      const url = new URL("/api/turso/getEpinetCustomMetrics", window.location.origin);
      if (epinetId) {
        url.searchParams.append("id", epinetId);
      }

      url.searchParams.append("visitorType", $epinetCustomFilters.visitorType || "all");

      if ($epinetCustomFilters.selectedUserId) {
        url.searchParams.append("userId", $epinetCustomFilters.selectedUserId);
      }

      if ($epinetCustomFilters.startHour !== null) {
        url.searchParams.append("startHour", $epinetCustomFilters.startHour.toString());
      }

      if ($epinetCustomFilters.endHour !== null) {
        url.searchParams.append("endHour", $epinetCustomFilters.endHour.toString());
      }

      const response = await fetch(url.toString(), {
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
        // Check if data is still loading
        const epinetData = result.data.epinet;

        if (epinetData && (epinetData.status === "loading" || epinetData.status === "refreshing")) {
          // If data is still loading, poll again after delay
          if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
            const delayMs =
              POLLING_DELAYS[pollingAttempts] || POLLING_DELAYS[POLLING_DELAYS.length - 1];

            const newTimer = setTimeout(() => {
              setPollingAttempts(pollingAttempts + 1);
              fetchEpinetData();
            }, delayMs);

            setPollingTimer(newTimer);
            return;
          }
        }

        // Update the stores with the data
        analyticsStore.setKey("epinet", result.data.epinet);
        analyticsStore.setKey("status", "complete");

        const currentFilterState = epinetCustomFilters.get();
        epinetCustomFilters.set({
          ...currentFilterState,
          userCounts: result.data.userCounts || [],
          hourlyNodeActivity: result.data.hourlyNodeActivity || {},
        });

        setPollingAttempts(0);
      } else {
        throw new Error(result.error || "Unknown API error");
      }
    } catch (error) {
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      // Schedule a retry if we haven't reached max attempts
      if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
        const delayMs =
          POLLING_DELAYS[pollingAttempts] || POLLING_DELAYS[POLLING_DELAYS.length - 1];

        const newTimer = setTimeout(() => {
          setPollingAttempts(pollingAttempts + 1);
          fetchEpinetData();
        }, delayMs);

        setPollingTimer(newTimer);
      }
    } finally {
      analyticsStore.setKey("isLoading", false);
    }
  }, [epinetId, $epinetCustomFilters, pollingAttempts]);

  // Extract values from the store
  const { epinet, isLoading, status, error } = analytics;

  // Render loading state
  if ((isLoading || status === "loading") && !epinet) {
    return (
      <div className="h-96 bg-gray-100 rounded w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-myblue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-sm text-gray-600">Computing user journey data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !epinet) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p className="font-bold">Error loading user journey visualization</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setPollingAttempts(0);
            fetchEpinetData();
          }}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render empty state
  if (
    !epinet ||
    !epinet.nodes ||
    !epinet.links ||
    epinet.nodes.length === 0 ||
    epinet.links.length === 0
  ) {
    return (
      <div className="p-8 bg-gray-50 text-gray-800 rounded-lg text-center">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p>
          No user journey data is available yet. This visualization will appear when users start
          interacting with your content.
        </p>
      </div>
    );
  }

  // Render epinet visualization
  return (
    <div className="epinet-wrapper p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">{title}</h3>

      {/* Sankey Diagram */}
      <ErrorBoundary
        fallback={
          <div className="p-4 bg-red-50 text-red-800 rounded-lg">
            Error rendering user flow diagram. Please check the data and try again.
          </div>
        }
      >
        <div className="relative">
          {(isLoading || status === "loading" || status === "refreshing") && (
            <div className="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
              Updating...
            </div>
          )}
          <SankeyDiagram data={{ nodes: epinet.nodes, links: epinet.links }} />
          {showFilters && <EpinetDurationSelector />}
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default EpinetWrapper;
