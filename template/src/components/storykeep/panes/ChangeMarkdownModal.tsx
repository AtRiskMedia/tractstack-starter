import { paneFragmentIds, paneFragmentMarkdown } from "@/store/storykeep.ts";
import { useState } from "react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { fromMarkdown } from "mdast-util-from-markdown";
import { cleanHtmlAst } from "@/utils/compositor/markdownUtils.ts";
import { markdownToHtmlAst } from "@/utils/compositor/markdownUtils.ts";
import type { Root } from "hast";
import { useStore } from "@nanostores/react";
import { useStoryKeepUtils } from "@/utils/storykeep/StoryKeep_utils.ts";
import TractStackModal from "@/components/storykeep/panes/TractStackModal.tsx";
import { classNames } from "@/utils/common/helpers.ts";

export type ChangeMarkdownModalProps = {
  paneId: string;
  onClose: () => void;
};

enum RunState {
  None = 0,
  Revalidate = 1,
  Ready = 2,
}

const getButtonText = (state: RunState): string => {
  switch (state) {
    case RunState.Ready:
      return "Apply";
    case RunState.Revalidate:
      return "Validate Again";
    case RunState.None:
      return "Validate & Apply";
    default:
      return "UNKNOWN";
  }
};

const getButtonColor = (state: RunState): string => {
  switch (state) {
    case RunState.Ready:
      return "bg-green-300";
    case RunState.Revalidate:
      return "bg-orange-300";
    case RunState.None:
      return "bg-green-300";
    default:
      return "bg-blue-100";
  }
};

const ChangeMarkdownModal = (props: ChangeMarkdownModalProps) => {
  const ids = paneFragmentIds.get()[props.paneId].current;
  const markdownFragmentId = ids.last();

  const pane = paneFragmentMarkdown.get()[markdownFragmentId];
  const [markdown, setMarkdown] = useState<string>(pane?.current.markdown.body || "");
  const [error, setError] = useState<string>("");
  const [state, setState] = useState<RunState>(RunState.None);
  const $paneFragmentMarkdown = useStore(paneFragmentMarkdown, {
    keys: [markdownFragmentId],
  });
  const { updateStoreField } = useStoryKeepUtils(markdownFragmentId, []);

  function buildElementFromNewMarkdown() {
    const newHtmlAst = cleanHtmlAst(markdownToHtmlAst(markdown)) as Root;
    if (newHtmlAst) {
      const updatedFragment = {
        ...$paneFragmentMarkdown[markdownFragmentId]?.current,
        markdown: {
          ...$paneFragmentMarkdown[markdownFragmentId]?.current?.markdown,
          body: markdown,
          htmlAst: newHtmlAst,
        },
      };
      updateStoreField("paneFragmentMarkdown", updatedFragment);
      props.onClose();
    }
  }

  const process = () => {
    switch (state) {
      case RunState.Revalidate:
      case RunState.None: {
        const mdast = fromMarkdown(markdown);
        if (mdast) {
          setState(RunState.Ready);
          setError("");
          buildElementFromNewMarkdown();
        } else {
          setError("Validation error");
        }
        break;
      }
      case RunState.Ready:
        {
          buildElementFromNewMarkdown();
        }
        break;
    }
  };

  return (
    <TractStackModal
      widthProvider={() => "max-w-[80%]"}
      header={
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold mb-4">Generating Page</h2>
          <button
            className={classNames(
              "h-fit right-0 top-1/2 transform -translate-y-1/2",
              "bg-black hover:bg-myorange text-white rounded-full p-2 shadow-lg",
              "transition-all duration-300 ease-in-out"
            )}
            title="Cancel"
            onClick={() => props.onClose()}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      }
      body={
        <div className="flex flex-col h-fit w-full">
          {error?.length > 0 && <span className="text-red-500">{error}</span>}
          <textarea value={markdown} rows={16} onChange={(e) => setMarkdown(e.target.value)} />
          <div className="flex justify-end mt-4">
            <button
              className={`${getButtonColor(state)} p-4 rounded-md group-hover:bg-black`}
              onClick={process}
            >
              {getButtonText(state)}
            </button>
          </div>
        </div>
      }
    />
  );
};

export default ChangeMarkdownModal;
