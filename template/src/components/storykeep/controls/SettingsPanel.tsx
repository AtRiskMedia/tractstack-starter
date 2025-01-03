import { useStore } from "@nanostores/react";
import { settingsPanelStore } from "@/store/storykeep";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { type ReactElement } from "react";
import type { FlatNode } from "@/types";

// Panel type interfaces
interface BasePanelProps {
  node: FlatNode;
  parentNode?: FlatNode;
  layer?: number;
}

const CodeHookPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Code Hook Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

// Individual panel components
const StyleBreakPanel = ({ node }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Visual Break Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify(node, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleParentPanel = ({ node, parentNode, layer }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Parent Style Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <div>Layer: {layer}</div>
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleWidgetPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Widget Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleElementPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Element Style Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleImagePanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Image Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

const StyleLinkPanel = ({ node, parentNode }: BasePanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Link Settings</h2>
      <div className="p-4 bg-gray-100 rounded-lg">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ node, parentNode }, null, 2)}</pre>
      </div>
    </div>
  );
};

// Factory function to get the appropriate panel
const getPanel = (action: string, props: BasePanelProps): ReactElement | null => {
  switch (action) {
    case "style-break":
      return <StyleBreakPanel {...props} />;
    case "style-parent":
      return <StyleParentPanel {...props} />;
    case "style-widget":
      return <StyleWidgetPanel {...props} />;
    case "style-element":
      return <StyleElementPanel {...props} />;
    case "style-image":
      return <StyleImagePanel {...props} />;
    case "style-link":
      return <StyleLinkPanel {...props} />;
    case "setup-codehook":
      return <CodeHookPanel {...props} />;
    default:
      console.log(`SettingsPanel miss on ${action}`);
      return null;
  }
};

const SettingsPanel = () => {
  const signal = useStore(settingsPanelStore);

  if (!signal) return null;

  const panel = getPanel(signal.action, {
    node: signal.node,
    parentNode: signal.parentNode,
    layer: signal.layer,
  });

  if (!panel) return null;

  return (
    <div className="fixed bottom-0 right-0 flex flex-col items-start">
      <button
        onClick={() => settingsPanelStore.set(null)}
        className="mb-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Close settings panel"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className="bg-white shadow-lg w-full md:w-[500px] rounded-t-xl">
        <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
          <div className="p-6">{panel}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
