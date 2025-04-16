import type { BeliefDatum, EventStream } from "@/types";
import { useFilterPane } from "@/components/frontend/state/UseFilterPane.ts";
import { heldBeliefs } from "@/store/beliefs";
import { events } from "@/store/events";
import BackwardIcon from "@heroicons/react/24/outline/BackwardIcon";

// Define BeliefStore if not already in types.ts
interface BeliefStore {
  id: string;
  slug: string;
  verb: string;
  object?: string | boolean;
}

const Filter = (props: {
  id: string;
  heldBeliefsFilter: BeliefDatum;
  withheldBeliefsFilter: BeliefDatum;
}) => {
  const { id, heldBeliefsFilter, withheldBeliefsFilter } = props;

  useFilterPane(id, heldBeliefsFilter, withheldBeliefsFilter);

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    // Get slugs to remove from heldBeliefsFilter keys
    const slugsToRemove = Object.keys(heldBeliefsFilter || {});

    if (slugsToRemove.length === 0) return;

    // Filter out beliefs with matching slugs
    const currentBeliefs = heldBeliefs.get();
    const updatedBeliefs = currentBeliefs.filter(
      (belief: BeliefStore) => !slugsToRemove.includes(belief.slug)
    );
    heldBeliefs.set(updatedBeliefs);

    // Log UNSET event for each removed slug
    const currentEvents = events.get();
    const newEvents = slugsToRemove.map(
      (slug) =>
        ({
          id: slug,
          verb: "UNSET",
          object: true,
          type: "Belief",
        }) as EventStream
    );
    const filteredEvents = currentEvents.filter(
      (e: EventStream) => !(e.type === "Belief" && slugsToRemove.includes(e.id))
    );
    events.set([...filteredEvents, ...newEvents]);
  };

  return (
    <button
      title="Delete Pane"
      onClick={handleDelete}
      className="z-10 absolute top-2 right-2 p-1.5 bg-white rounded-full hover:bg-black"
    >
      <BackwardIcon className="h-6 w-6 text-mydarkgrey hover:text-white" />
    </button>
  );
};

export default Filter;
