import { useState, useCallback } from "react";
import { ulid } from "ulid";
import { getCtx } from "@/store/nodes.ts";
import { PaneConfigMode } from "@/types";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ActionBuilderField from "../fields/ActionBuilderField";
import { contentMap } from "@/store/events";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { GOTO_TARGETS } from "@/constants";
import { type Dispatch, type SetStateAction } from "react";
import type { ImpressionNode, PaneNode } from "@/types";

interface PaneImpressionPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneConfigMode>>;
}

const validateGotoAction = (value: string): boolean => {
  if (!value.startsWith("(goto (")) return false;

  try {
    const match = value.match(/\(goto\s+\(([^)]+)\)/);
    if (!match) return false;

    const parts = match[1].split(" ").filter(Boolean);
    if (parts.length === 0) return false;

    const target = parts[0];
    const targetConfig = GOTO_TARGETS[target];
    if (!targetConfig) return false;

    // For targets with subcommands
    if (targetConfig.subcommands) {
      if (parts.length < 2) return false;
      return targetConfig.subcommands.includes(parts[1]);
    }

    // For targets requiring parameters
    if (targetConfig.requiresParam) {
      if (parts.length < 2) return false;

      // For targets requiring two parameters
      if (targetConfig.requiresSecondParam) {
        return parts.length >= 3;
      }

      return true;
    }

    // For simple targets (like 'home')
    return true;
  } catch (e) {
    return false;
  }
};

const validateImpression = (impression: Partial<ImpressionNode>): boolean => {
  return !!(
    impression.title?.trim() &&
    impression.body?.trim() &&
    impression.buttonText?.trim() &&
    impression.actionsLisp?.trim() &&
    validateGotoAction(impression.actionsLisp.trim())
  );
};

const PaneImpressionPanel = ({ nodeId, setMode }: PaneImpressionPanelProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;
  const impressionNode = Array.from(allNodes.values()).find(
    (node): node is ImpressionNode => node.nodeType === "Impression" && node.parentId === nodeId
  );
  if (!paneNode) return null;

  // Local state for form values
  const [formData, setFormData] = useState({
    title: impressionNode?.title || "",
    body: impressionNode?.body || "",
    buttonText: impressionNode?.buttonText || "",
    actionsLisp: impressionNode?.actionsLisp || "",
  });

  const updateStore = useCallback(
    (data: Partial<ImpressionNode>) => {
      const ctx = getCtx();
      let node: ImpressionNode;
      if (impressionNode) {
        // Update existing impression
        node = {
          ...cloneDeep(impressionNode),
          tagName: "impression",
          ...data,
          isChanged: true,
        };
        ctx.modifyNodes([node]);
      } else {
        // Create new impression linked to this Pane
        node = {
          id: ulid(),
          tagName: "impression",
          nodeType: "Impression",
          parentId: nodeId,
          ...data,
          isChanged: true,
        } as ImpressionNode;
        ctx.addTemplateImpressionNode(nodeId, node);
      }
      ctx.modifyNodes([
        {
          ...paneNode,
          isChanged: true,
        },
      ]);
    },
    [nodeId, impressionNode]
  );

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (field === "actionsLisp") {
      if (validateImpression(newData)) {
        updateStore(newData);
      }
    }
  };

  const handleBlur = () => {
    const newData = {
      title: formData.title.trim(),
      body: formData.body.trim(),
      buttonText: formData.buttonText.trim(),
      actionsLisp: formData.actionsLisp.trim(),
    };

    if (validateImpression(newData)) {
      updateStore(newData);
    }
  };

  const handleRemove = () => {
    if (impressionNode?.id && impressionNode?.parentId) {
      const ctx = getCtx();
      ctx.deleteNode(impressionNode.id);
      ctx.modifyNodes([
        {
          ...paneNode,
          isChanged: true,
        },
      ]);
      setMode(PaneConfigMode.DEFAULT);
    }
  };

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6";
  const isValid = validateImpression(formData);

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Impression Settings</h3>
          <button
            onClick={() => setMode(PaneConfigMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-mydarkgrey">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter impression title"
              className={commonInputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-mydarkgrey">Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => handleInputChange("body", e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter impression body text"
              className={`${commonInputClass} min-h-[100px]`}
            />
          </div>

          <div>
            <label className="block text-sm text-mydarkgrey">Button Text</label>
            <input
              type="text"
              value={formData.buttonText}
              onChange={(e) => handleInputChange("buttonText", e.target.value)}
              onBlur={handleBlur}
              placeholder="Enter button text"
              className={commonInputClass}
            />
          </div>

          <div className="relative">
            <label className="block text-sm text-mydarkgrey">Actions</label>
            <ActionBuilderField
              value={formData.actionsLisp}
              onChange={(value) => handleInputChange("actionsLisp", value)}
              contentMap={contentMap.get()}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isValid ? (
              <div className="text-green-600 flex items-center gap-1">
                <CheckIcon className="w-5 h-5" />
                <span>Valid impression configuration</span>
              </div>
            ) : (
              <div className="text-mydarkgrey">
                All fields are required and action must be fully configured
              </div>
            )}
          </div>

          {impressionNode && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleRemove}
                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md flex items-center gap-2"
              >
                <XMarkIcon className="w-5 h-5" />
                Remove Impression
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaneImpressionPanel;
