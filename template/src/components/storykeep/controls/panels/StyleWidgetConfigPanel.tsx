import { useMemo } from "react";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { tagTitles, widgetMeta } from "../../../../constants";
import { settingsPanelStore } from "@/store/storykeep";
import type { Tag, FlatNode, MarkdownPaneFragmentNode } from "../../../../types";

interface StyleWidgetConfigPanelProps {
  node: FlatNode;
}

const StyleWidgetConfigPanel = ({ node }: StyleWidgetConfigPanelProps) => {
  if (!node?.tagName) {
    return null;
  }
  const widgetId = "identifyAs(someValue)".substring(0, "identifyAs(someValue)".indexOf("("));
  const widgetName = widgetMeta[widgetId].title || `Widget`;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Configure {widgetName}</h2>
      </div>
    </div>
  );
};

export default StyleWidgetConfigPanel;
