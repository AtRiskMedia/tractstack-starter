import type { StoryStatus } from "@/types.ts";

interface Props {
  transcriptId: string;
  uuid: string;
  status: StoryStatus;
  onDelete: (uuid: string) => void;
}

export const StoryEntryTailView = (props: Props) => {
  const { uuid, transcriptId } = props;

  return (
    <div className="flex p-2">
      <div className="flex gap-2">
        <a
          type="button"
          className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
          href={`/transcribe/stories/${transcriptId}/${uuid}`}
        >
          Edit
        </a>
        <button
          type="button"
          className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
          onClick={() => props.onDelete(uuid)}
        >
          X
        </button>
      </div>
    </div>
  );
};
