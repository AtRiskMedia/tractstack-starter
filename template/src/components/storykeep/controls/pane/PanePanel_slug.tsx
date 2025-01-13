import { useState, useEffect } from "react";
import { getCtx } from "@/store/nodes.ts";
import { PaneMode } from "./ConfigPanePanel";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { Dispatch, SetStateAction } from "react";
import type { PaneNode } from "@/types";

interface PaneSlugPanelProps {
  nodeId: string;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const PaneSlugPanel = ({ nodeId, setMode }: PaneSlugPanelProps) => {
  const [slug, setSlug] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const paneNode = allNodes.get(nodeId) as PaneNode;
  if (!paneNode) return null;

  useEffect(() => {
    setSlug(paneNode.slug);
    setCharCount(paneNode.slug.length);
  }, [paneNode.slug]);

  const validateSlug = (value: string): string => {
    // Convert to lowercase and replace spaces with hyphens
    return (
      value
        .toLowerCase()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, "-")
        // Remove any characters that aren't alphanumeric or hyphens
        .replace(/[^a-z0-9-]/g, "")
    );
    // Replace multiple consecutive hyphens with a single hyphen
    //.replace(/-+/g, '-')
    // Remove hyphens from start and end
    //.replace(/^-+|-+$/g, '');
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = validateSlug(e.target.value);
    if (newSlug.length <= 50) {
      setSlug(newSlug);
      setCharCount(newSlug.length);
      setIsValid(newSlug.length >= 3 && newSlug.length <= 40);
      setWarning(newSlug.length > 40 && newSlug.length <= 50);
    }
  };

  const handleSlugBlur = () => {
    if (slug.length >= 3) {
      // Only update if meets minimum length
      const ctx = getCtx();
      const updatedNode = { ...cloneDeep(paneNode), slug, isChanged: true };
      ctx.modifyNodes([updatedNode]);
    }
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4 shadow-inner">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Pane Slug</h3>
          <button
            onClick={() => setMode(PaneMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={slug}
            onChange={handleSlugChange}
            onBlur={handleSlugBlur}
            className={`w-full px-2 py-1 pr-16 rounded-md border ${
              charCount < 3
                ? "border-red-500 bg-red-50"
                : isValid
                  ? "border-green-500 bg-green-50"
                  : warning
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-300"
            }`}
            placeholder="Enter URL slug (3-60 characters recommended)"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {charCount < 3 ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            ) : isValid ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : warning ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            ) : null}
            <span
              className={`text-sm ${
                charCount < 3
                  ? "text-red-500"
                  : isValid
                    ? "text-green-500"
                    : warning
                      ? "text-yellow-500"
                      : "text-gray-500"
              }`}
            >
              {charCount}/75
            </span>
          </div>
        </div>
        <div className="mt-4 text-lg space-y-4">
          <div className="text-gray-600">This is solely used for analytics!</div>
          <div className="py-4">
            {charCount < 3 && (
              <span className="text-red-500">Slug must be at least 3 characters</span>
            )}
            {charCount >= 3 && charCount < 5 && (
              <span className="text-gray-500">
                Consider adding more characters for better description
              </span>
            )}
            {warning && (
              <span className="text-yellow-500">Slug is getting long - consider shortening it</span>
            )}
            {isValid && charCount >= 5 && (
              <span className="text-green-500">Good URL length and format!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaneSlugPanel;
