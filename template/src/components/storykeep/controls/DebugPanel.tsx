import { showGuids } from "@/store/development.ts";
import { getCtx, ROOT_NODE_NAME } from "@/store/nodes.ts";

const DebugPanel = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Debug Panel</h2>
      <button
        onClick={() => {
          showGuids.set(!showGuids.get());
          getCtx().notifyNode(ROOT_NODE_NAME);
        }}
        className="bg-cyan-200 rounded-md p-2 border-2 border-black text-mydarkgrey hover:text-myblue flex items-center"
      >
        Show Node IDs
      </button>
      <div className="p-4 bg-gray-100 rounded-lg"></div>
    </div>
  );
};

export default DebugPanel;
