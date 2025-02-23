import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "@/components/storykeep/controls/recharts/DashboardActivity";
import { storedDashboardAnalytics, storyfragmentAnalyticsStore } from "@/store/storykeep";

interface Stat {
  name: string;
  events: number;
  visitors: number;
  period: string;
}

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const [isClient, setIsClient] = useState(false);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const $storyfragmentAnalytics = useStore(storyfragmentAnalyticsStore);

  // Calculate totals from analytics store
  const analytics = Object.values($storyfragmentAnalytics.byId);
  const totalLifetimeVisitors = analytics.reduce(
    (sum, fragment) => sum + (fragment?.unique_visitors || 0),
    0
  );
  const total24hVisitors = analytics.reduce(
    (sum, fragment) => sum + (fragment?.last_24h_unique_visitors || 0),
    0
  );
  const total7dVisitors = analytics.reduce(
    (sum, fragment) => sum + (fragment?.last_7d_unique_visitors || 0),
    0
  );
  const total28dVisitors = analytics.reduce(
    (sum, fragment) => sum + (fragment?.last_28d_unique_visitors || 0),
    0
  );

  const stats: Stat[] = [
    {
      name: "Last 24 Hours",
      events: $storedDashboardAnalytics?.stats?.daily ?? 0,
      visitors: total24hVisitors,
      period: "24h",
    },
    {
      name: "Past 7 Days",
      events: $storedDashboardAnalytics?.stats?.weekly ?? 0,
      visitors: total7dVisitors,
      period: "7d",
    },
    {
      name: "Past 28 Days",
      events: $storedDashboardAnalytics?.stats?.monthly ?? 0,
      visitors: total28dVisitors,
      period: "28d",
    },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Analytics Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {stats.map((item) => (
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
                  <div className="flex-1 text-right">
                    <div className="text-sm text-gray-600">Unique Visitors</div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {item.visitors === 0 ? "-" : formatNumber(item.visitors)}
                    </div>
                  </div>
                </div>
              </dd>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors mb-4">
          <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
          <dd className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-cyan-700">
              {totalLifetimeVisitors === 0 ? "-" : formatNumber(totalLifetimeVisitors)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
          </dd>
        </div>

        <div className="p-4">
          <DashboardActivity />
        </div>
      </div>
    </div>
  );
}
