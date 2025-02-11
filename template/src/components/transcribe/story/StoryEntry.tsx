import { StoryEntryTailView } from "./StoryEntryTailView";
import type { StoryStatus } from "@/types.ts";

export type StoryEntryProps = {
  transcriptId: string;
  uuid: string;
  title: string;
  status: StoryStatus;
  onDelete: (uuid: string) => void;
};

export const StoryEntry = (props: StoryEntryProps) => {
  const { uuid, title, transcriptId, status } = props;

  return (
    <div className={"flex border-2 border-accent-600 justify-between px-2"} data-uuid={uuid}>
      <p>{title}</p>
      <StoryEntryTailView
        transcriptId={transcriptId}
        onDelete={props.onDelete}
        uuid={uuid}
        status={status}
      />
    </div>
  );
};
