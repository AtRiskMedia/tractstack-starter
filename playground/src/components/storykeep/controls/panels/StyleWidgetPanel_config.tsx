import { useEffect, useState } from "react";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers";
import { widgetMeta } from "@/constants";
import SingleParam from "../fields/SingleParam";
import BooleanParam from "../fields/BooleanParam";
import MultiParam from "../fields/MultiParam";
import BeliefWidget from "../widgets/BeliefWidget";
import BunnyWidget from "../widgets/BunnyWidget";
import IdentifyAsWidget from "../widgets/IdentifyAsWidget";
import SignupWidget from "../widgets/SignupWidget";
import ToggleWidget from "../widgets/ToggleWidget";
import YouTubeWidget from "../widgets/YouTubeWidget";
import type { FlatNode } from "@/types";

interface StyleWidgetConfigPanelProps {
  node: FlatNode;
}

function StyleWidgetConfigPanel({ node }: StyleWidgetConfigPanelProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (!init) setInit(true);
  }, []);

  if (!node || !("copy" in node) || typeof node.copy !== "string") return null;

  // Extract the widget type from the node's copy
  const regexpHook =
    /^(identifyAs|youtube|bunny|bunnyContext|toggle|resource|belief|signup)\((.*)\)$/;
  const hookMatch = node.copy?.match(regexpHook);
  if (!hookMatch) return null;

  const widgetType = hookMatch[1];
  const widgetInfo = widgetMeta[widgetType];

  // If widget is not found in widgetMeta, display error message
  if (!widgetInfo) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        Widget type '{widgetType}' not found in configuration. Please check the widget type.
      </div>
    );
  }

  // Get params from node and ensure they match the expected count from metadata
  const existingParams = node.codeHookParams?.map((p) => String(p)) || [];
  const expectedParamCount = widgetInfo.parameters.length;

  // Ensure params array is the right length with default values if needed
  const params = Array(expectedParamCount)
    .fill("")
    .map((_, index) => {
      if (index < existingParams.length && existingParams[index] !== undefined) {
        return existingParams[index];
      }
      return widgetInfo.parameters[index].defaultValue;
    });

  const handleParamUpdate = (updatedParams: string[]) => {
    if (!init) return;

    // Create a copy of the node to avoid direct mutation
    const newNode = cloneDeep(node);

    // Ensure all parameters are strings
    const stringParams = updatedParams.map((param) => String(param));

    // Update the codeHookParams
    newNode.codeHookParams = stringParams;

    // Update the copy field to match the new params
    newNode.copy = `${widgetType}(${stringParams.join("|")})`;

    // Mark the node as changed
    newNode.isChanged = true;

    // Update the node in the store
    getCtx().modifyNodes([newNode]);
  };

  // Specialized widget editors for specific widget types
  const specializedEditors = {
    belief: () => <BeliefWidget node={node} onUpdate={handleParamUpdate} />,
    bunny: () => <BunnyWidget node={node} onUpdate={handleParamUpdate} />,
    identifyAs: () => <IdentifyAsWidget node={node} onUpdate={handleParamUpdate} />,
    signup: () => <SignupWidget node={node} onUpdate={handleParamUpdate} />,
    toggle: () => <ToggleWidget node={node} onUpdate={handleParamUpdate} />,
    youtube: () => <YouTubeWidget node={node} onUpdate={handleParamUpdate} />,
  };

  // Generic parameter editor for widget types without specific editors
  const GenericParamEditor = () => (
    <div className="space-y-4">
      {widgetInfo.parameters.map((param, index) => {
        const paramValue = params[index] || param.defaultValue;

        switch (param.type) {
          case "boolean":
            return (
              <BooleanParam
                key={index}
                label={param.label}
                value={paramValue === "true"}
                onChange={(value) => {
                  const newParams = [...params];
                  newParams[index] = value ? "true" : "false";
                  handleParamUpdate(newParams);
                }}
              />
            );
          case "multi-string":
            return (
              <MultiParam
                key={index}
                label={param.label}
                values={paramValue ? paramValue.split(",").filter(Boolean) : []}
                onChange={(values) => {
                  const newParams = [...params];
                  newParams[index] = values.join(",");
                  handleParamUpdate(newParams);
                }}
              />
            );
          case "scale":
            // Scale parameters have special rendering requirements but still use string storage
            return (
              <SingleParam
                key={index}
                label={param.label}
                value={paramValue}
                disabled={true}
                onChange={(value) => {
                  const newParams = [...params];
                  newParams[index] = value;
                  handleParamUpdate(newParams);
                }}
              />
            );
          case "string":
          default:
            return (
              <SingleParam
                key={index}
                label={param.label}
                value={paramValue}
                onChange={(value) => {
                  const newParams = [...params];
                  newParams[index] = value;
                  handleParamUpdate(newParams);
                }}
              />
            );
        }
      })}
    </div>
  );

  // Render the editor (either specialized or generic)
  const renderEditor = () => {
    // Check if we have a specialized editor for this widget type
    if (widgetType in specializedEditors) {
      return specializedEditors[widgetType as keyof typeof specializedEditors]();
    }

    // Fall back to generic editor
    return <GenericParamEditor />;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">{widgetInfo.title}</h3>
      <p className="text-sm text-gray-600">
        Configure the parameters for this {widgetType} widget.
      </p>
      {renderEditor()}
    </div>
  );
}

export default StyleWidgetConfigPanel;
