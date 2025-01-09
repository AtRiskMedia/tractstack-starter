const AddPanePanel = ({ nodeId }: { nodeId: string }) => {
  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full">
        <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-md">Insert Pane</div>
        <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
          + Design New
        </button>
        <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
          + Visual Break
        </button>
        <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
          + Re-use existing pane
        </button>
        <button className="px-2 py-1 bg-white text-cyan-700 text-sm rounded hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white shadow-sm transition-colors z-10">
          + Custom Code Hook
        </button>
      </div>
    </div>
  );
};

export default AddPanePanel;
