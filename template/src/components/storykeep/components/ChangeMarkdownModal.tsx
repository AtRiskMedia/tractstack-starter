import TractStackModal from "@/components/storykeep/components/TractStackModal.tsx";
import { paneFragmentMarkdown } from "@/store/storykeep.ts";
import { useState } from "react";

export type ChangeMarkdownModalProps = {
  paneId: string;
}

const ChangeMarkdownModal = (props: ChangeMarkdownModalProps) => {
  const pane = paneFragmentMarkdown.get()[props.paneId];
  const [markdown, setMarkdown] = useState<string>("");

  return (
    <TractStackModal
      widthProvider={() => "max-w-[80%]"}
      header={
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold mb-4">Change Markdown</h2>
        </div>
      }
      body={
        <div className="flex flex-col h-fit w-full">
          <input type="text" multiple value={markdown}/>
        </div>
      }
    />
  );
};

export default ChangeMarkdownModal;