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

  const handleGoBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    // Determine which slugs to remove based on MATCH-ACROSS
    let slugsToRemove: string[] = [];

    // Check if there's a MATCH-ACROSS key
    if (heldBeliefsFilter && "MATCH-ACROSS" in heldBeliefsFilter) {
      // If MATCH-ACROSS exists, only remove the belief slugs listed in it
      const matchAcross = heldBeliefsFilter["MATCH-ACROSS"];
      if (Array.isArray(matchAcross)) {
        slugsToRemove = matchAcross;
      } else if (typeof matchAcross === "string") {
        slugsToRemove = [matchAcross];
      }
    } else if (heldBeliefsFilter) {
      // If no MATCH-ACROSS, remove all keys from heldBeliefsFilter
      slugsToRemove = Object.keys(heldBeliefsFilter).filter((key) => key !== "MATCH-ACROSS");
    }

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
      title="Go Back"
      onClick={handleGoBack}
      className="z-10 absolute top-2 right-2 p-1.5 bg-white rounded-full hover:bg-black text-mydarkgrey hover:text-white"
    >
      <BackwardIcon className="h-6 w-6" />
    </button>
  );
};

export default Filter;
