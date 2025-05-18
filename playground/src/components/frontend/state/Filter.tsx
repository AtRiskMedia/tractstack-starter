import BackwardIcon from "@heroicons/react/24/outline/BackwardIcon";
import { useFilterPane } from "@/components/frontend/state/UseFilterPane.ts";
import { heldBeliefs } from "@/store/beliefs";
import { events } from "@/store/events";
import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import type { BeliefDatum, EventStream } from "@/types";

const Filter = (props: {
  id: string;
  heldBeliefsFilter: BeliefDatum;
  withheldBeliefsFilter: BeliefDatum;
}) => {
  const { id, heldBeliefsFilter, withheldBeliefsFilter } = props;
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useFilterPane(id, heldBeliefsFilter, withheldBeliefsFilter);

  // Clean up any lingering timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleGoBack = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    let slugsToRemove: string[] = [];
    let linkedBeliefs: string[] = [];

    if (heldBeliefsFilter) {
      slugsToRemove = Object.keys(heldBeliefsFilter).filter(
        (key) => key !== "MATCH-ACROSS" && key !== "LINKED-BELIEFS"
      );
      if ("LINKED-BELIEFS" in heldBeliefsFilter) {
        const linkedBeliefsValue = heldBeliefsFilter["LINKED-BELIEFS"];
        if (Array.isArray(linkedBeliefsValue) && linkedBeliefsValue.length > 0) {
          linkedBeliefs = [...linkedBeliefsValue];
          linkedBeliefsValue.forEach((linkedSlug) => {
            if (!slugsToRemove.includes(linkedSlug)) {
              slugsToRemove.push(linkedSlug);
            }
          });
        }
      }
    }

    if (slugsToRemove.length === 0) return;

    const currentBeliefs = heldBeliefs.get();
    const updatedBeliefs = currentBeliefs.filter((belief) => !slugsToRemove.includes(belief.slug));
    heldBeliefs.set(updatedBeliefs);

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

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Determine which beliefs to search for in the DOM
    // If there are linked beliefs, prioritize those, otherwise use the main slugs
    const beliefsToFind = linkedBeliefs.length > 0 ? linkedBeliefs : slugsToRemove;

    scrollTimeoutRef.current = setTimeout(() => {
      for (const beliefSlug of beliefsToFind) {
        const selector = `[data-belief="${beliefSlug}"]`;
        const beliefElement = document.querySelector(selector);
        if (beliefElement) {
          const paneElement = beliefElement.closest('[id^="pane-"]');
          if (paneElement) {
            paneElement.scrollIntoView({ behavior: "smooth", block: "center" });
            break; // Only scroll to the first found element
          }
        }
      }
      scrollTimeoutRef.current = undefined;
    }, 100);
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
