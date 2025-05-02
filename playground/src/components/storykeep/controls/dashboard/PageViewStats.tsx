import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "@/components/storykeep/controls/recharts/DashboardActivity";
import SankeyDiagram from "@/components/storykeep/controls/d3/SankeyDiagram";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import {
  isDemoModeStore,
  storedDashboardAnalytics,
  analyticsDuration,
  storyfragmentAnalyticsStore,
  type StoryfragmentAnalyticsStore,
} from "@/store/storykeep";
import { contentMap } from "@/store/events";
import type { LeadMetrics, DashboardAnalytics, StoryfragmentAnalytics } from "@/types";

// Define types for Sankey data
interface SankeyNode {
  name: string;
  id: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface Stat {
  name: string;
  events: number;
  period: string;
}

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

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const isDemoMode = isDemoModeStore.get();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEpinetLoading, setIsEpinetLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics | null>(null);
  const [epinetData, setEpinetData] = useState<SankeyData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<{
    lead: "loading" | "complete" | "error";
    epinet: "loading" | "complete" | "error";
  }>({ lead: "loading", epinet: "loading" });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics) as DashboardAnalytics;
  const $storyfragmentAnalytics = useStore(
    storyfragmentAnalyticsStore
  ) as StoryfragmentAnalyticsStore;
  const $contentMap = useStore(contentMap);
  const $analyticsDuration = useStore(analyticsDuration);

  const analytics: StoryfragmentAnalytics[] = Object.values($storyfragmentAnalytics.byId);
  const totalLifetimeVisitors: number = analytics.reduce(
    (sum: number, fragment: StoryfragmentAnalytics) => sum + (fragment.unique_visitors || 0),
    0
  );

  const stats: Stat[] = [
    {
      name: "Last 24 Hours",
      events: $storedDashboardAnalytics?.stats?.daily ?? 0,
      period: "24h",
    },
    {
      name: "Past 7 Days",
      events: $storedDashboardAnalytics?.stats?.weekly ?? 0,
      period: "7d",
    },
    {
      name: "Past 28 Days",
      events: $storedDashboardAnalytics?.stats?.monthly ?? 0,
      period: "28d",
    },
  ];

  // Function to fetch lead metrics with status handling
  const fetchLeadMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/turso/getLeadMetrics");
      if (response.ok) {
        const result = await response.json();

        // Check if data has a status field indicating it's still loading
        if (result.data && "status" in result.data) {
          setLoadingStatus((prev) => ({ ...prev, lead: result.data.status }));

          // If status is loading, we'll use the data but keep polling
          if (result.data.status === "loading") {
            // Only initiate polling if we haven't already
            if (!pollingInterval) {
              const interval = setInterval(() => {
                fetchLeadMetrics();
              }, 5000); // Poll every 5 seconds
              setPollingInterval(interval);
            }
          } else if (result.data.status === "complete") {
            // Data is complete, clear polling
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          }
        } else {
          // No status field means it's complete
          setLoadingStatus((prev) => ({ ...prev, lead: "complete" }));

          // Clear polling if it was active
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }

        setLeadMetrics(result.data || null);
        setIsLoading(false);
      } else {
        console.error("Failed to fetch lead metrics:", response.statusText);
        setLoadingStatus((prev) => ({ ...prev, lead: "error" }));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching lead metrics:", error);
      setLoadingStatus((prev) => ({ ...prev, lead: "error" }));
      setIsLoading(false);
    }
  }, [pollingInterval]);

  // Function to fetch epinet metrics with status handling
  const fetchEpinetMetrics = useCallback(async () => {
    try {
      const contentItems = Object.values($contentMap);
      const epinets = contentItems.filter((item: any) => item.type === "Epinet");

      if (epinets.length > 0) {
        const firstEpinetId = epinets[0].id;
        const response = await fetch(
          `/api/turso/getEpinetMetrics?id=${firstEpinetId}&duration=${$analyticsDuration}`
        );

        if (response.ok) {
          const result = await response.json();

          // Check if the result contains a status field
          if (result.data && typeof result.data === "object" && "status" in result.data) {
            setLoadingStatus((prev) => ({ ...prev, epinet: result.data.status }));

            // Even if still loading, we'll set partial data if it has nodes/links
            if (result.data.nodes && result.data.links) {
              setEpinetData(result.data);
            }

            // If status is loading, we'll use the data but keep polling
            if (result.data.status === "loading") {
              // Only create new polling interval if not already polling
              if (!pollingInterval) {
                const interval = setInterval(() => {
                  fetchEpinetMetrics();
                }, 5000); // Poll every 5 seconds
                setPollingInterval(interval);
              }
            } else if (result.data.status === "complete") {
              // Data is complete, clear polling
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
            }
          } else if (
            result.data &&
            Array.isArray(result.data.nodes) &&
            Array.isArray(result.data.links) &&
            result.data.nodes.length > 0
          ) {
            setEpinetData(result.data);
            setLoadingStatus((prev) => ({ ...prev, epinet: "complete" }));

            // Clear polling if it was active
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          } else {
            console.warn("Invalid epinet data structure:", result.data);
            setEpinetData(null);
            setLoadingStatus((prev) => ({ ...prev, epinet: "error" }));
          }
        } else {
          console.error("Failed to fetch epinet metrics:", response.statusText);
          setLoadingStatus((prev) => ({ ...prev, epinet: "error" }));
        }
      } else {
        console.warn("No epinets found in content map");
        setEpinetData(null);
        setLoadingStatus((prev) => ({ ...prev, epinet: "complete" })); // Not an error, just no data
      }
    } catch (error) {
      console.error("Error fetching epinet metrics:", error);
      setEpinetData(null);
      setLoadingStatus((prev) => ({ ...prev, epinet: "error" }));
    } finally {
      setIsEpinetLoading(false);
    }
  }, [$contentMap, $analyticsDuration, pollingInterval]);

  useEffect(() => {
    setIsClient(true);

    // Initial data fetching
    fetchLeadMetrics();
    fetchEpinetMetrics();

    // Cleanup polling interval on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [$analyticsDuration]);

  const downloadLeadsCSV = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);

      const response = await fetch("/api/turso/getLeadsList");

      if (!response.ok) {
        throw new Error("Failed to fetch leads list");
      }

      const result = await response.json();
      const leadsList = result.data;

      if (!leadsList || !leadsList.length) {
        alert("No lead data available to download");
        return;
      }

      const headers = Object.keys(leadsList[0]);
      let csvContent = headers.join(",") + "\n";

      leadsList.forEach((lead: any) => {
        const row = headers.map((header) => {
          const value =
            lead[header] === null || lead[header] === undefined ? "" : String(lead[header]);
          return value.includes(",") ? `"${value}"` : value;
        });
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `leads-data-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading leads:", error);
      alert("Failed to download leads. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const LoadingPlaceholder = () => (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Analytics Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
              <hr className="my-3.5 border-gray-100" />
              <div className="flex justify-between">
                <div className="w-1/2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="w-1/2 flex justify-end">
                  <div className="w-3/4">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2 animate-pulse"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          ))}
        </div>

        <div className="p-4">
          {/* Placeholder for DashboardActivity */}
          <div className="h-60 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
          {/* Placeholder for SankeyDiagram */}
          <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="h-96 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Skeleton loader for lead metrics panel
  const LeadMetricsSkeleton = () => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
      <div className="flex justify-between items-start">
        <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
      <dd className="mt-2">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-sm text-gray-600 mt-1">Registered leads (emails collected)</div>
      </dd>
    </div>
  );

  // Skeleton loader for visitors panel
  const VisitorsSkeleton = () => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
      <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
      <dd className="mt-2">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
      </dd>
    </div>
  );

  // Skeleton loader for stats panel
  const StatsSkeleton = ({ name }: { name: string }) => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
      <dt className="text-sm font-bold text-gray-800">{name}</dt>
      <dd className="mt-2">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Events</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
      </dd>
      <hr className="my-3.5 border-gray-100" />
      <dd>
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Anonymous Visitors</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-600">Known Leads</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1"></div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>-</span>
          <span>-</span>
        </div>
      </dd>
    </div>
  );

  if (!isClient) return null;

  // Show full loading screen on initial load
  if (isLoading && isEpinetLoading) return <LoadingPlaceholder />;

  // Progressive rendering for data as it becomes available
  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          Analytics Dashboard
          {(loadingStatus.lead === "loading" || loadingStatus.epinet === "loading") && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data in background...)
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {stats.map((item) => {
            // Show skeleton loader if data is still loading
            if (loadingStatus.lead === "loading" || !leadMetrics) {
              return <StatsSkeleton key={item.period} name={item.name} />;
            }

            const period = item.period;
            const firstTimeValue = leadMetrics[
              `first_time_${period}` as keyof LeadMetrics
            ] as number;
            const returningValue = leadMetrics[
              `returning_${period}` as keyof LeadMetrics
            ] as number;
            const firstTimePercentage = leadMetrics[
              `first_time_${period}_percentage` as keyof LeadMetrics
            ] as number;
            const returningPercentage = leadMetrics[
              `returning_${period}_percentage` as keyof LeadMetrics
            ] as number;

            return (
              <div
                key={item.period}
                className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors"
              >
                <dt className="text-sm font-bold text-gray-800">{item.name}</dt>

                <dd className="mt-2">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Events</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {item.events === 0 ? "-" : formatNumber(item.events)}
                      </div>
                    </div>
                  </div>
                </dd>

                <hr className="my-3.5 border-gray-100" />

                <dd>
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Anonymous Visitors</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {firstTimeValue === 0 ? "-" : formatNumber(firstTimeValue)}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm text-gray-600">Known Leads</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {returningValue === 0 ? "-" : formatNumber(returningValue)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1 overflow-hidden">
                    <div
                      className="bg-cyan-600 h-2.5 float-left"
                      style={{ width: `${firstTimePercentage}%` }}
                    />
                    <div
                      className="bg-cyan-300 h-2.5 float-left"
                      style={{ width: `${returningPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{firstTimePercentage.toFixed(1)}% Anonymous</span>
                    <span>{returningPercentage.toFixed(1)}% Known</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Visitors panel with skeleton loader if loading */}
          {loadingStatus.lead === "loading" ? (
            <VisitorsSkeleton />
          ) : (
            <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
              <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
              <dd className="mt-2">
                <div className="text-2xl font-bold tracking-tight text-cyan-700">
                  {totalLifetimeVisitors === 0 ? "-" : formatNumber(totalLifetimeVisitors)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
              </dd>
            </div>
          )}

          {/* Leads panel with skeleton loader if loading */}
          {loadingStatus.lead === "loading" || !leadMetrics ? (
            <LeadMetricsSkeleton />
          ) : (
            <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
              <div className="flex justify-between items-start">
                <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
                {leadMetrics.total_leads > 0 && (
                  <button
                    onClick={downloadLeadsCSV}
                    disabled={isDemoMode || isDownloading}
                    title={isDemoMode ? `Not so fast!` : `Download leads report`}
                    style={{
                      textDecoration: isDemoMode ? "line-through" : "none",
                      cursor: isDemoMode ? "not-allowed" : "pointer",
                    }}
                    className="flex items-center text-xs text-myblue hover:text-myorange transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    {isDownloading ? "Downloading..." : "Download"}
                  </button>
                )}
              </div>
              <dd className="mt-2">
                <div className="text-2xl font-bold tracking-tight text-cyan-700">
                  {leadMetrics.total_leads === 0 ? "-" : formatNumber(leadMetrics.total_leads)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Registered leads (emails collected)
                </div>
              </dd>
            </div>
          )}
        </div>

        <div className="p-4 motion-safe:animate-fadeInUp">
          <DashboardActivity />

          {/* Show loading indicator for Sankey diagram */}
          {loadingStatus.epinet === "loading" && !epinetData ? (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100 mt-12">
              <h4 className="font-bold font-action text-xl mb-4">User Journeys (Loading...)</h4>
              <div className="h-96 bg-gray-100 rounded w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-myblue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-4 text-sm text-gray-600">Computing user journey data...</p>
                </div>
              </div>
            </div>
          ) : loadingStatus.epinet === "error" ? (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-red-100 mt-12">
              <h4 className="font-bold font-action text-xl text-red-800">User Journeys</h4>
              <div className="p-4 bg-red-50 text-red-800 rounded-lg mt-4">
                There was an error loading the user journey data. Please try refreshing the page.
              </div>
            </div>
          ) : epinetData && epinetData.nodes && epinetData.nodes.length > 0 ? (
            <ErrorBoundary
              fallback={
                <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                  Error rendering user flow diagram. Please check the data and try again.
                </div>
              }
            >
              <div className="relative">
                {loadingStatus.epinet === "loading" && (
                  <div className="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                    Updating...
                  </div>
                )}
                <SankeyDiagram data={{ nodes: epinetData.nodes, links: epinetData.links }} />
              </div>
            </ErrorBoundary>
          ) : (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100 mt-12">
              <h4 className="font-bold font-action text-xl">User Journeys</h4>
              <div className="p-4 bg-gray-50 text-gray-800 rounded-lg mt-4">
                No user journey data is available yet. This visualization will appear when users
                start interacting with your content.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
