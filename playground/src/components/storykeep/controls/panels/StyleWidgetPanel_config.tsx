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
  const [values, setValues] = useState(() => {
    // Create an object to hold all values
    const initialValues: { [key: string]: string | string[] } = {};

    // Map each parameter to its corresponding value
    meta.valueLabels.forEach((label, index) => {
      // Handle array values based on multi flag
      if (meta.multi[index]) {
        initialValues[label] = Array.isArray(node.codeHookParams[index])
          ? node.codeHookParams[index]
          : [node.codeHookParams[index] || meta.valueDefaults[index]];
      } else {
        initialValues[label] = node.codeHookParams[index] || meta.valueDefaults[index];
      }
    });

    return initialValues;
  });

  const updateStore = (newValues: typeof values) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const widgetNode = allNodes.get(node.id);
    if (!widgetNode || !isWidgetNode(widgetNode) || !widgetId) return;

    // Convert values object back to params array
    const newParams = meta.valueLabels.map((label) => newValues[label]);

    // Create the widget copy string
    const paramStrings = meta.valueLabels.map((label ) => {
      const value = newValues[label];
      return Array.isArray(value) ? value.join(",") : value;
    });
    const newCopy = `${widgetId}(${paramStrings.join("|")})`;

    const newNodes = new Map(allNodes);
    newNodes.set(node.id, createUpdatedWidget(widgetNode, newCopy, newParams));
    ctx.allNodes.set(newNodes);

    if (parentId) {
      ctx.notifyNode(parentId);
    }
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

        {meta.valueLabels.map((label, index) => (
          <div key={label} className="space-y-1">
            <label className="block text-sm text-mydarkgrey">{label}</label>
            {meta.multi[index] ? (
              <div className="space-y-1">
                {(values[label] as string[]).map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center space-x-2">
                    <div
                      contentEditable
                      onBlur={(e) => {
                        const newArray = [...(values[label] as string[])];
                        newArray[valueIndex] = e.currentTarget.textContent || "";
                        const newValues = { ...values, [label]: newArray };
                        setValues(newValues);
                        updateStore(newValues);
                      }}
                      className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6 flex-1"
                      style={{ minHeight: "1em", pointerEvents: "auto" }}
                      data-placeholder={`Enter ${label}`}
                      suppressContentEditableWarning
                    >
                      {value}
                    </div>
                    <button
                      onClick={() => {
                        const newArray = (values[label] as string[]).filter(
                          (_, i) => i !== valueIndex
                        );
                        const newValues = { ...values, [label]: newArray };
                        setValues(newValues);
                        updateStore(newValues);
                      }}
                      className="text-myorange hover:text-black"
                      title="Remove value"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newArray = [...(values[label] as string[]), ""];
                    const newValues = { ...values, [label]: newArray };
                    setValues(newValues);
                    updateStore(newValues);
                  }}
                  className="text-myblue hover:text-black flex items-center"
                  title={`Add ${label}`}
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  <span>Add {label}</span>
                </button>
              </div>
            ) : meta.isScale[index] ? (
              <select
                value={values[label] as string}
                onChange={(e) => {
                  const newValues = { ...values, [label]: e.target.value };
                  setValues(newValues);
                  updateStore(newValues);
                }}
                className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6 w-full"
              >
                <option value="yn">Yes/No</option>
                <option value="likert">Likert Scale</option>
                <option value="10pt">10-point Scale</option>
              </select>
            ) : (
              <div
                contentEditable
                onBlur={(e) => {
                  const newValues = {
                    ...values,
                    [label]: e.currentTarget.textContent || "",
                  };
                  setValues(newValues);
                  updateStore(newValues);
                }}
                className="rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-myorange xs:text-sm xs:leading-6"
                style={{ minHeight: "1em", pointerEvents: "auto" }}
                data-placeholder={`Enter ${label}`}
                suppressContentEditableWarning
              >
                {values[label]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StyleWidgetConfigPanel;
