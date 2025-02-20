import { useState, useEffect } from "react";
import { getCtx } from "@/store/nodes.ts";
import { PaneConfigMode } from "@/types";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { Dispatch, SetStateAction } from "react";
import type { PaneNode } from "@/types";

interface PaneTitlePanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneConfigMode>>;
}

const PaneTitlePanel = ({ nodeId, setMode }: PaneTitlePanelProps) => {
  const [title, setTitle] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  useEffect(() => {
    setTitle(paneNode.title);
    setCharCount(paneNode.title.length);
  }, [paneNode.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 50) {
      // Prevent more than 70 chars
      setTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 5 && newTitle.length <= 35);
      setWarning(newTitle.length > 35 && newTitle.length <= 50);
    }
  };

  const handleTitleBlur = () => {
    if (title.length >= 5) {
      // Only update if meets minimum length
      const ctx = getCtx();
      const updatedNode = { ...cloneDeep(paneNode), title, isChanged: true };
      ctx.modifyNodes([updatedNode]);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Pane Title</h3>
          <button
            onClick={() => setMode(PaneConfigMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className={`w-full px-2 py-1 pr-16 rounded-md border ${
              charCount < 5
                ? "border-red-500 bg-red-50"
                : isValid
                  ? "border-green-500 bg-green-50"
                  : warning
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-300"
            }`}
            placeholder="Enter story fragment title (50-60 characters recommended)"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {charCount < 5 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                charCount < 5
                  ? "text-red-500"
                  : isValid
                    ? "text-green-500"
                    : warning
                      ? "text-yellow-500"
                      : "text-gray-500"
              }`}
            >
              {charCount}/50
            </span>
          </div>
        </div>
        <div className="mt-4 text-lg space-y-4">
          <div className="text-gray-600">
            Write a clear, descriptive title for this piece of content. This is used for your own
            internal analytics.
          </div>
          <div className="py-4">
            {charCount < 5 && (
              <span className="text-red-500">Title must be at least 5 characters</span>
            )}
            {charCount >= 5 && charCount < 10 && (
              <span className="text-gray-500">
                Add {10 - charCount} more characters for optimal length
              </span>
            )}
            {warning && <span className="text-yellow-500">Title is getting long</span>}
            {isValid && <span className="text-green-500">Perfect title length!</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaneTitlePanel;
