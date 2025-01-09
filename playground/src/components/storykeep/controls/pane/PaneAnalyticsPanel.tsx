interface PanePanelProps {
  nodeId: string;
}

const PaneAnalyticsPanel = ({ nodeId }: PanePanelProps) => {
  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        pane analytics here: {nodeId}
      </div>
    </div>
  );
};

export default PaneAnalyticsPanel;
