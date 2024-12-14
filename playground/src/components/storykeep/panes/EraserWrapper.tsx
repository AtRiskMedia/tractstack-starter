import { allowTagErase } from "../../../utils/compositor/markdownUtils";
import type { ReactNode } from "react";
import type { MarkdownLookup } from "../../../types";
import { eraseElement } from "@/utils/storykeep/StoryKeep_utils.ts";

interface Props {
  fragmentId: string;
  paneId: string;
  outerIdx: number;
  idx: number | null;
  queueUpdate: (id: string, updateFn: () => void) => void;
  children: ReactNode;
  markdownLookup: MarkdownLookup;
}

const EraserWrapper = ({
  fragmentId,
  paneId,
  outerIdx,
  idx,
  queueUpdate,
  children,
  markdownLookup,
}: Props) => {
  const contentId = `${outerIdx}${typeof idx === "number" ? `-${idx}` : ""}-${fragmentId}`;
  const allowTag = allowTagErase(outerIdx, idx, markdownLookup);

  const handleErase = () => {
    queueUpdate(contentId, () => {
      eraseElement(paneId, fragmentId, outerIdx, idx, markdownLookup);
    });
  };

  if (!allowTag) return children;
  return (
    <div className="relative">
      {children}
      <div
        onClick={handleErase}
        title="Delete this!"
        className="absolute inset-0 z-101 h-full w-full cursor-pointer mix-blend-exclusion outline-dashed
                   outline-2 outline-offset-[-2px] outline-myorange/50 hover:bg-myorange
                   hover:bg-opacity-20 hover:outline-white/20"
      />
    </div>
  );
};

export default EraserWrapper;
