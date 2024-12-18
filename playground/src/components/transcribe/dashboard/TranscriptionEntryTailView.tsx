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
                    <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
                            onClick={() => props.onEdit(uuid)}>
                        Edit
                    </button>
                    <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue"
                            onClick={() => props.onCreateStory(uuid)}>Create Story</button>
                </div>
            }
            {state === ProcessState.ERROR &&
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue">Retry</button>
                    <button className="px-4 py-2 rounded-md text-lg shadow-sm transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange bg-myorange text-white hover:bg-myblue">Delete</button>
                </div>
            }
        </div>
    );
}