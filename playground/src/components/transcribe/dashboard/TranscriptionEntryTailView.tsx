import { ProcessState } from "@/types.ts";

interface Props {
    uuid: string;
    state: ProcessState;
    onEdit: (uuid: string) => void;
    onCreateStory: (uuid: string) => void;
}

export const TranscriptionEntryTailView = (props: Props) => {
    const {uuid, state} = props;

    return (
        <div className="flex p-2">
            {state === ProcessState.COMPLETED &&
                <div className="flex gap-2">
                    <button className="btn btn-blue"
                            onClick={() => props.onEdit(uuid)}>
                        Edit
                    </button>
                    <button className="btn btn-blue"
                            onClick={() => props.onCreateStory(uuid)}>Create Story</button>
                </div>
            }
            {state === ProcessState.ERROR &&
                <div className="flex gap-2">
                    <button className="bg-neutral-500 text-neutral-50">Retry</button>
                    <button className="bg-neutral-500 text-neutral-50">Delete</button>
                </div>
            }
        </div>
    );
}