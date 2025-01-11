import { useStore } from "@nanostores/react";
import { useState, useEffect, type MouseEvent } from "react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import { storedAnalytics } from "@/store/storykeep";

const PaneAnalyticsPanel = ({ nodeId }: { nodeId: string }) => {
  const $storedAnalytics = useStore(storedAnalytics);
  const [isDataReady, setIsDataReady] = useState(false);

  const data = $storedAnalytics[nodeId] || { pie: [], line: [] };

  useEffect(() => {
    if ($storedAnalytics && nodeId in $storedAnalytics) {
      setIsDataReady(true);
    }
  }, [$storedAnalytics, nodeId]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  if (!isDataReady) {
    return (
      <div className="p-1.5" onClick={handleClick}>
        <div className="rounded-xl w-64 bg-mywhite p-3.5">
          <p className="text-mydarkgrey">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1.5" onClick={handleClick}>
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">
          <ArrowUpIcon className="w-6 h-6 inline-block" /> Recent activity on this Pane
        </div>

        <div className="flex gap-1">
          {data.pie.map((verb) => (
            <span key={verb.id} className="px-2 py-1 text-cyan-700 text-sm rounded shadow-inner">
              {verb.id}: {verb.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaneAnalyticsPanel;
