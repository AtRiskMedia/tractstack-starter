import type { StoryStatus } from "@/types.ts";

interface Props {
    transcriptId: string;
    uuid: string;
    status: StoryStatus;
    onDelete: (uuid: string) => void;
}

export const StoryEntryTailView = (props: Props) => {
    const {uuid, transcriptId} = props;

    return (
        <div className="flex p-2">
            <div className="flex gap-2">
                <a type="button"
                   className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-500 px-2 font-medium text-neutral-50 transition active:scale-110"
                   href={`/stories/${transcriptId}/${uuid}`}>Edit</a>
                <button type="button"
                        className="btn btn-red rounded-md text-neutral-50 px-2"
                        onClick={() => props.onDelete(uuid)}>
                    X
                </button>
            </div>
        </div>
    );
}