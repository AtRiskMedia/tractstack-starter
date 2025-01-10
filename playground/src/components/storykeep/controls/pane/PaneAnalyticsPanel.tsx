import { useStore } from "@nanostores/react";
import { useState, useEffect } from "react";
import { analyticsDuration, /*showAnalytics,*/ storedAnalytics } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";

const PaneAnalyticsPanel = ({ nodeId }: { nodeId: string }) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $storedAnalytics = useStore(storedAnalytics);
  const duration = $analyticsDuration;
  const [isDataReady, setIsDataReady] = useState(false);

  // Get node data from context
  const ctx = getCtx();
  const node = ctx.allNodes.get().get(nodeId);
  const title = node && `title` in node && typeof node.title === `string` ? node.title : "Unnamed";
  const data = $storedAnalytics[nodeId] || { pie: [], line: [] };

  useEffect(() => {
    if ($storedAnalytics && nodeId in $storedAnalytics) {
      setIsDataReady(true);
    }
  }, [$storedAnalytics, nodeId]);

  //const updateDuration = (newValue: `daily` | `weekly` | `monthly`) => {
  //  analyticsDuration.set(newValue);
  //};

  //const toggleAnalytics = () => {
  //  showAnalytics.set(false);
  //};

  if (!isDataReady) {
    return (
      <div className="bg-myblack/90 px-3.5 py-1.5">
        <div className="rounded-xl w-64 bg-mywhite p-3.5">
          <p className="text-mydarkgrey">Loading analytics...</p>
        </div>
      </div>
    );
  }
  console.log(`pane ${nodeId}`, duration, title, JSON.stringify(data));
  return <div>...coming</div>;
};

export default PaneAnalyticsPanel;
