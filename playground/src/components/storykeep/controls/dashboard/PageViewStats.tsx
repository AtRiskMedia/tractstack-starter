import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "@/components/storykeep/controls/recharts/DashboardActivity.tsx";
import { storedDashboardAnalytics } from "@/store/storykeep.ts";

interface Stat {
  name: string;
  value: number;
}

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const [isClient, setIsClient] = useState(false);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const stats: Stat[] = [
    {
      name: "Events over last 24 hours",
      value: $storedDashboardAnalytics?.stats?.daily ?? 0,
    },
    {
      name: "Past 7 days",
      value: $storedDashboardAnalytics?.stats?.weekly ?? 0,
    },
    {
      name: "Last 28 days",
      value: $storedDashboardAnalytics?.stats?.monthly ?? 0,
    },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Engagement Analytics</h3>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div key={item.name} className="px-4 py-3 bg-white text-cyan-700 rounded shadow-sm">
              <dt className="text-sm font-bold text-gray-800">{item.name}</dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight">
                {item.value === 0 ? `-` : formatNumber(item.value)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="p-4">
          <DashboardActivity />
        </div>
      </div>
    </div>
  );
}
