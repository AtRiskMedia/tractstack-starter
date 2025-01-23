import SingleParam from "../fields/SingleParam";
import type { FlatNode } from "@/types";

interface YouTubeWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

function YouTubeWidget({ node, onUpdate }: YouTubeWidgetProps) {
  const params = node.codeHookParams || [];
  const embedCode = String(params[0] || "");
  const title = String(params[1] || "");

  return (
    <div className="space-y-4">
      <SingleParam
        label="Embed Code"
        value={embedCode}
        onChange={(value) => onUpdate([value, title])}
      />
      <SingleParam 
        label="Title" 
        value={title} 
        onChange={(value) => onUpdate([embedCode, value])} 
      />
    </div>
  );
}

export default YouTubeWidget;
