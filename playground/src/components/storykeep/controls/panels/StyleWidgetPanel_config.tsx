import { useState } from "react";
import { widgetMeta } from "../../../../constants";
import { settingsPanelStore } from "@/store/storykeep";
import { getCtx } from "@/store/nodes";
import { isWidgetNode } from "../../../../utils/nodes/type-guards";
import type { FlatNode } from "../../../../types";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";

interface StyleWidgetConfigPanelProps {
  node: FlatNode;
  parentId: string;
}

const createUpdatedWidget = (
  widgetNode: FlatNode,
  newCopy: string,
  newParams: (string | string[])[]
) => {
  return {
    id: widgetNode.id,
    parentId: widgetNode.parentId,
    nodeType: widgetNode.nodeType,
    tagName: "code" as const,
    copy: newCopy,
    codeHookParams: newParams,
    isChanged: true,
  };
};

const StyleWidgetConfigPanel = ({ node, parentId }: StyleWidgetConfigPanelProps) => {
  if (!isWidgetNode(node)) return null;

  const widgetId = node.copy && node.copy.substring(0, node.copy.indexOf("("));
  const meta = widgetId && widgetMeta[widgetId];

  if (!meta) return null;

  // Initialize state from codeHookParams
  const [values, setValues] = useState({
    beliefTag: node.codeHookParams[0] || meta.valueDefaults[0],
    matchingValues: Array.isArray(node.codeHookParams[1])
      ? node.codeHookParams[1]
      : [meta.valueDefaults[1]],
    prompt: node.codeHookParams[2] || meta.valueDefaults[2],
  });

  const updateStore = (newValues: typeof values) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const widgetNode = allNodes.get(node.id);
    if (!widgetNode || !isWidgetNode(widgetNode)) return;

    const newParams = [newValues.beliefTag, newValues.matchingValues, newValues.prompt];

    const newCopy = `${widgetId}(${[
      newValues.beliefTag,
      newValues.matchingValues.join(","),
      newValues.prompt,
    ].join("|")})`;

    const newNodes = new Map(allNodes);
    newNodes.set(node.id, createUpdatedWidget(widgetNode, newCopy, newParams));
    ctx.allNodes.set(newNodes);

    if (parentId) {
      ctx.notifyNode(parentId);
    }
  };

  const addMatchingValue = () => {
    setValues((prev) => {
      const newValues = {
        ...prev,
        matchingValues: [...prev.matchingValues, ""],
      };
      updateStore(newValues);
      return newValues;
    });
  };

  const removeMatchingValue = (index: number) => {
    setValues((prev) => {
      const newValues = {
        ...prev,
        matchingValues: prev.matchingValues.filter((_, i) => i !== index),
      };
      updateStore(newValues);
      return newValues;
    });
  };

  const handleCloseConfig = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: "style-widget",
    });
  };

  return (
    <div className="my-4 flex flex-wrap gap-x-1.5 gap-y-3.5">
      <div className="space-y-4 max-w-md min-w-80">
        <div className="flex flex-row flex-nowrap justify-between">
          <h2 className="text-xl font-bold">{meta.title}</h2>
          <button
            className="text-myblue hover:text-black"
            title="Return to preview pane"
            onClick={handleCloseConfig}
          >
            Go Back
          </button>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-mydarkgrey">Belief Tag</label>
          <div
            contentEditable
            onBlur={(e) => {
              const newValues = {
                ...values,
                beliefTag: e.currentTarget.textContent || "",
              };
              setValues(newValues);
              updateStore(newValues);
            }}
            className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
            style={{ minHeight: "1em", pointerEvents: "auto" }}
            data-placeholder="Enter Belief Tag"
            suppressContentEditableWarning
          >
            {values.beliefTag}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-mydarkgrey">Belief Matching Value(s)</label>
          <div className="space-y-1">
            {values.matchingValues.map((value, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  contentEditable
                  onBlur={(e) => {
                    const newValues = {
                      ...values,
                      matchingValues: values.matchingValues.map((v, i) =>
                        i === index ? e.currentTarget.textContent || "" : v
                      ),
                    };
                    setValues(newValues);
                    updateStore(newValues);
                  }}
                  className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
                  style={{ minHeight: "1em", pointerEvents: "auto" }}
                  data-placeholder="Enter Belief Matching Value"
                  suppressContentEditableWarning
                >
                  {value}
                </div>
                <button
                  onClick={() => removeMatchingValue(index)}
                  className="text-myorange hover:text-black"
                  title="Remove value"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              onClick={addMatchingValue}
              className="text-myblue hover:text-black flex items-center"
              title="Add value"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              <span>Add Belief Matching Value(s)</span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-mydarkgrey">Question Prompt</label>
          <div
            contentEditable
            onBlur={(e) => {
              const newValues = {
                ...values,
                prompt: e.currentTarget.textContent || "",
              };
              setValues(newValues);
              updateStore(newValues);
            }}
            className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
            style={{ minHeight: "1em", pointerEvents: "auto" }}
            data-placeholder="Enter Question Prompt"
            suppressContentEditableWarning
          >
            {values.prompt}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleWidgetConfigPanel;
