import TractStackModal from "@/components/storykeep/components/TractStackModal.tsx";
import { paneFragmentIds, paneFragmentMarkdown } from "@/store/storykeep.ts";
import { useState } from "react";
import { classNames } from "@/utils/helpers.ts";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";

export type ChangeMarkdownModalProps = {
  paneId: string;
  onClose: () => void;
}

const ChangeMarkdownModal = (props: ChangeMarkdownModalProps) => {
  const ids = paneFragmentIds.get()[props.paneId].current;
  const pane = paneFragmentMarkdown.get()[ids.last()];
  const [markdown, setMarkdown] = useState<string>(pane?.current.markdown.body || "");

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
          <textarea value={markdown} rows={16}/>
          <div className="flex justify-end mt-4">
            <button className="bg-green-300 p-4 rounded-md group-hover:bg-black">Apply</button>
          </div>
        </div>
      }
    />
  );
};

export default ChangeMarkdownModal;