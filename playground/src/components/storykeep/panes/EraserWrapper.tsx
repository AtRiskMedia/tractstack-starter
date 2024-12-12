import { useStore } from "@nanostores/react";
import {
  paneFragmentMarkdown,
  unsavedChangesStore,
  lastInteractedTypeStore,
  lastInteractedPaneStore,
} from "../../../store/storykeep";
import {
  removeElementFromMarkdown,
  updateHistory,
  allowTagErase,
} from "../../../utils/compositor/markdownUtils";
import { cloneDeep, isDeepEqual } from "../../../utils/common/helpers";
import type { ReactNode } from "react";
import type { MarkdownLookup } from "../../../types";

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
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [fragmentId],
  });
  const $unsavedChanges = useStore(unsavedChangesStore, { keys: [paneId] });
  const contentId = `${outerIdx}${typeof idx === "number" ? `-${idx}` : ""}-${fragmentId}`;
  const allowTag = allowTagErase(outerIdx, idx, markdownLookup);

  const handleErase = () => {
    queueUpdate(contentId, () => {
      lastInteractedTypeStore.set(`markdown`);
      lastInteractedPaneStore.set(paneId);
      const currentField = cloneDeep($paneFragmentMarkdown[fragmentId]);
      const now = Date.now();
      const newHistory = updateHistory(currentField, now);
      const newValue = removeElementFromMarkdown(
        currentField.current,
        outerIdx,
        idx,
        markdownLookup
      );
      paneFragmentMarkdown.setKey(fragmentId, {
        ...currentField,
        current: newValue,
        history: newHistory,
      });
      const isUnsaved = !isDeepEqual(newValue, currentField.original);
      unsavedChangesStore.setKey(paneId, {
        ...$unsavedChanges[paneId],
        paneFragmentMarkdown: isUnsaved,
      });
    });
  };

  if (!allowTag) return children;
  return (
    <div className="relative">
      {children}
      <div
        onClick={handleErase}
        title="Delete this!"
        className="absolute inset-0 w-full h-full z-101 hover:bg-myorange hover:bg-opacity-20 hover:outline-white/20
                   outline-2 outline-dashed outline-myorange/50 outline-offset-[-2px]
                   mix-blend-exclusion cursor-pointer"
      />
    </div>
  );
};

export default EraserWrapper;
