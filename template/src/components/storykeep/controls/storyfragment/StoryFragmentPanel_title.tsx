import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getCtx } from "@/store/nodes.ts";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import type { StoryFragmentNode } from "@/types";
import { StoryFragmentMode, type StoryFragmentModeType } from "@/types.ts";

interface StoryFragmentTitlePanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<StoryFragmentModeType>>;
}

const StoryFragmentTitlePanel = ({ nodeId, setMode }: StoryFragmentTitlePanelProps) => {
  const [title, setTitle] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;
  if (!storyfragmentNode) return null;

  useEffect(() => {
    setTitle(storyfragmentNode.title);
    setCharCount(storyfragmentNode.title.length);
  }, [storyfragmentNode.title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 70) {
      // Prevent more than 70 chars
      setTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 50 && newTitle.length <= 60);
      setWarning(newTitle.length > 60 && newTitle.length <= 70);
    }
  };

  const handleTitleBlur = () => {
    if (title.length >= 30) {
      // Only update if meets minimum length
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const updatedNode = { ...storyfragmentNode, title, isChanged: true };
      const newNodes = new Map(allNodes);
      newNodes.set(nodeId, updatedNode);
      ctx.allNodes.set(newNodes);
      ctx.notifyNode(nodeId);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Page Title</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="relative md:mr-48 md:pr-48">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            className={`w-full px-2 py-1 pr-16 rounded-md border ${
              charCount < 30
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
            {charCount < 30 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                charCount < 30
                  ? "text-red-500"
                  : isValid
                    ? "text-green-500"
                    : warning
                      ? "text-yellow-500"
                      : "text-gray-500"
              }`}
            >
              {charCount}/70
            </span>
          </div>
        </div>
        <div className="mt-4 text-lg">
          <div className="text-gray-600">
            Write a clear, descriptive title that accurately represents your page content.
            <ul className="ml-4 mt-1">
              <li>
                <CheckIcon className="h-4 w-4 inline" /> Include relevant keywords
              </li>
              <li>
                <CheckIcon className="h-4 w-4 inline" /> Avoid unnecessary words like "welcome to"
                or "the"
              </li>
              <li>
                <CheckIcon className="h-4 w-4 inline" /> Unique titles across your website
              </li>
            </ul>
          </div>
          <div className="py-4">
            {charCount < 30 && (
              <span className="text-red-500">Title must be at least 30 characters</span>
            )}
            {charCount >= 30 && charCount < 50 && (
              <span className="text-gray-500">
                Add {50 - charCount} more characters for optimal length
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

export default StoryFragmentTitlePanel;
