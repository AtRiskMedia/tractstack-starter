interface StoryFragmentPanelProps {
  nodeId: string;
}

const StoryFragmentAnalyticsPanel = ({ nodeId }: StoryFragmentPanelProps) => {
  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        storyfragment analytics here {nodeId}
      </div>
    </div>
  );
};

export default StoryFragmentAnalyticsPanel;
