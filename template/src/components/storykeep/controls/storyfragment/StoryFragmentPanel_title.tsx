import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { cloneDeep, titleToSlug, findUniqueSlug } from "@/utils/common/helpers.ts";
import { getCtx } from "@/store/nodes.ts";
import { contentMap } from "@/store/events.ts";
import { StoryFragmentMode, type StoryFragmentNode } from "@/types.ts";

interface StoryFragmentOpenGraphPanelProps {
  nodeId: string;
  setMode?: (mode: StoryFragmentMode) => void;
}

const StoryFragmentOpenGraphPanel = ({ nodeId, setMode }: StoryFragmentOpenGraphPanelProps) => {
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

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 70) {
      // Prevent more than 70 chars
      setTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 35 && newTitle.length <= 60);
      setWarning(newTitle.length > 60 && newTitle.length <= 70);
    }
  };

  const handleTitleBlur = () => {
    if (title.length >= 10) {
      // Only update if meets minimum length
      const ctx = getCtx();
      const existingSlugs = contentMap
        .get()
        .filter((item) => ["Pane", "StoryFragment"].includes(item.type))
        .map((item) => item.slug);
      const newSlug =
        storyfragmentNode.slug === `` ? findUniqueSlug(titleToSlug(title), existingSlugs) : null;
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        title,
        ...(newSlug ? { slug: newSlug } : {}),
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Page Title</h3>
          {setMode && (
            <button
              onClick={() => setMode && setMode(StoryFragmentMode.DEFAULT)}
              className="text-myblue hover:text-black"
            >
              ← Close Panel
            </button>
          )}
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
              charCount < 10
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
            {charCount < 10 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                charCount < 10
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
            {charCount < 10 && (
              <span className="text-red-500">Title must be at least 10 characters</span>
            )}
            {charCount >= 10 && charCount < 50 && (
              <span className="text-gray-500">
                Add {50 - charCount} more characters for optimal length
              </span>
            )}
            {` `}
            {warning && <span className="text-yellow-500">Title is getting long</span>}
            {isValid && <span className="text-green-500">Perfect title length!</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentOpenGraphPanel;
