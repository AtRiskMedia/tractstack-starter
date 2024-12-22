import { TranscriptionEntryTailView } from "./TranscriptionEntryTailView";
import { ProcessState, type TranscriptionEntry } from "@/types.ts";

interface Props extends TranscriptionEntry {
  onCreateStory: (transcriptUuid: string) => void;
  onEditTranscript: (transcriptUuid: string) => void;
}

export const TranscribeEntry = (props: Props) => {
  const { uuid, title, state } = props;

  const getColor = (): string => {
    switch (state) {
      case ProcessState.COMPLETED:
        return "bg-green-400";
      case ProcessState.ERROR:
        return "bg-red-400";
      case ProcessState.QUEUED:
      default:
        return "bg-accent-200";
    }
  };

  return (
    <div
      className={"flex border-2 border-accent-600 justify-between px-2 " + getColor()}
      data-uuid={uuid}
    >
      <p>{title}</p>
      <p>STATE: {ProcessState[state]}</p>

      <TranscriptionEntryTailView
        uuid={uuid}
        onEdit={(uuid) => props.onEditTranscript(uuid)}
        onCreateStory={(uuid) => props.onCreateStory(uuid)}
        state={state}
      />
    </div>
  );
};
