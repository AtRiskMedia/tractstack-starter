import { useState, useEffect } from "react";
import ColorPickerCombo from "../fields/ColorPickerCombo";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { settingsPanelStore } from "@/store/storykeep";
import type { BasePanelProps } from "../SettingsPanel";
import type { BaseNode, FlatNode } from "../../../../types";
import { getCtx } from "../../../../store/nodes";

interface PaneNodeWithBg extends BaseNode {
  nodeType: "Pane";
  bgColour: string;
}

interface NodeWithParentClasses extends FlatNode {
  parentClasses?: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  }[];
}

const hasParentClasses = (node: BaseNode | undefined): node is NodeWithParentClasses => {
  return node !== undefined && "parentClasses" in node;
};

const isPaneNodeWithBg = (node: BaseNode | undefined): node is PaneNodeWithBg => {
  return node?.nodeType === "Pane" && "bgColour" in node;
};

interface ParentStyles {
  bgColor: string;
  parentClasses: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  }[];
}

const StyleParentPanel = ({ node, parentNode, layer, config }: BasePanelProps) => {
  if (!parentNode || !node || !isPaneNodeWithBg(parentNode) || !hasParentClasses(node)) {
    return null;
  }
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  const [currentLayer, setCurrentLayer] = useState<number>(layer || 1);
  const [settings, setSettings] = useState<ParentStyles>({
    bgColor: parentNode.bgColour || "#FFFFFF",
    parentClasses: node.parentClasses || [],
  });

  useEffect(() => {
    setCurrentLayer(layer || 1);
  }, [layer]);

  useEffect(() => {
    if (!parentNode) return;

    const prevSettings = {
      bgColor: parentNode.bgColour || "#FFFFFF",
    };

    // Get mutable copy of the parent node
    const paneNode = allNodes.get(parentNode.id) as PaneNodeWithBg;
    if (!paneNode || !isPaneNodeWithBg(paneNode)) return;

    if (settings.bgColor !== prevSettings.bgColor) {
      paneNode.bgColour = settings.bgColor;

      // Update the node in the store
      const newNodes = new Map(allNodes);
      newNodes.set(parentNode.id, paneNode);
      ctx.allNodes.set(newNodes);

      // Notify parent of changes
      ctx.notifyNode(parentNode.id);
    }
  }, [settings, parentNode, ctx, allNodes]);

  const currentClasses = settings.parentClasses[currentLayer - 1];

  const handleClickRemove = (name: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      className: name,
      action: `style-parent-remove`,
    });
  };
  const handleClickUpdate = (name: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      layer: currentLayer,
      className: name,
      action: `style-parent-update`,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pane Outer Styles</h2>

      <ColorPickerCombo
        title="Background Color"
        defaultColor={settings.bgColor}
        onColorChange={(color: string) => setSettings((prev) => ({ ...prev, bgColor: color }))}
        config={config!}
      />

      <div className="flex gap-2 items-center mb-4 bg-slate-50 p-2 rounded-md">
        <span className="text-sm text-mydarkgrey">Layer:</span>
        <div className="flex gap-1">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentLayer === num ? "bg-myblue text-white" : "hover:bg-slate-100"
              }`}
              onClick={() => setCurrentLayer(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {currentClasses && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(currentClasses.mobile).map(([className]) => (
            <SelectedTailwindClass
              key={className}
              name={className}
              values={{
                mobile: currentClasses.mobile[className],
                tablet: currentClasses.tablet?.[className],
                desktop: currentClasses.desktop?.[className],
              }}
              onRemove={handleClickRemove}
              onUpdate={handleClickUpdate}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
          <li>
            <em>Actions:</em>
          </li>
          <li>
            <button className="hover:text-black underline font-bold">Add Style</button>
          </li>
          <li>
            <button className="hover:text-black underline font-bold">Delete Layer</button>
          </li>
          <li>
            {settings.parentClasses.length === 1 ? (
              <button className="hover:text-black underline font-bold">Add Layer</button>
            ) : (
              <>
                {`Add Layer:`}{" "}
                <button className="hover:text-black underline font-bold">Before</button>
                {`, `}
                <button className="hover:text-black underline font-bold">After</button>
              </>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleParentPanel;
