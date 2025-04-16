import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { heldBeliefsScales } from "@/utils/common/beliefs";
import { classNames } from "@/utils/common/helpers";
import { heldBeliefs } from "@/store/beliefs";
import { events } from "@/store/events";
import type { BeliefDatum, EventStream } from "@/types";

const SingleIdentifyAs = ({
  value,
  target,
  noprompt,
  readonly = false,
}: {
  value: { slug: string; target: string; extra: string };
  target: string;
  noprompt: boolean;
  readonly?: boolean;
}) => {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const thisTitle = noprompt ? `Tell me more!` : value.target;
  const thisScale = heldBeliefsScales.agreement;
  const start = { id: 0, slug: `0`, name: `0`, color: `` };
  const [selected, setSelected] = useState(start);
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  useEffect(() => {
    if (!readonly) {
      const matchingBeliefs = $heldBeliefsAll.filter((e: BeliefDatum) => e.slug === value.slug);
      const hasMatchingBelief = matchingBeliefs.find((belief) => belief.object === target);
      const hasOtherSelected = matchingBeliefs.length > 0 && !hasMatchingBelief;

      if (hasMatchingBelief && hasMatchingBelief.object === target) {
        setSelected(thisScale[0]);
        setIsOtherSelected(false);
      } else {
        setSelected(start);
        setIsOtherSelected(hasOtherSelected);
      }
    }
  }, [$heldBeliefsAll, readonly]);

  const handleClick = () => {
    if (readonly) return false;

    const matchingBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug === value.slug);
    const hasOtherBelief = matchingBeliefs.some((b) => b.object !== target);

    if (hasOtherBelief) {
      // Unset the current selection (without logging UNSET)
      setSelected(start);
      const prevBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug !== value.slug);
      heldBeliefs.set([...prevBeliefs]);

      // Set the new selection after a 100ms delay
      setTimeout(() => {
        const newScale = thisScale.at(0)!;
        setSelected(newScale);
        const event = {
          id: value.slug,
          verb: `IDENTIFY_AS`,
          object: target,
          type: `Belief`,
        };
        const belief = {
          id: value.slug,
          verb: `IDENTIFY_AS`,
          slug: value.slug,
          object: target,
        };
        heldBeliefs.set([...prevBeliefs, belief]);
        const prevEvents = events
          .get()
          .filter((e: EventStream) => !(e.type === `Belief` && e.id === value.slug));
        events.set([...prevEvents, event]);
      }, 100);
    } else if (selected.id === 0) {
      // Toggle ON (no existing belief or same target)
      const newScale = thisScale.at(0)!;
      setSelected(newScale);
      const event = {
        id: value.slug,
        verb: `IDENTIFY_AS`,
        object: target,
        type: `Belief`,
      };
      const belief = {
        id: value.slug,
        verb: `IDENTIFY_AS`,
        slug: value.slug,
        object: target,
      };
      const prevBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug !== value.slug);
      heldBeliefs.set([...prevBeliefs, belief]);
      const prevEvents = events
        .get()
        .filter((e: EventStream) => !(e.type === `Belief` && e.id === value.slug));
      events.set([...prevEvents, event]);
    } else {
      // Toggle OFF
      setSelected(start);
      const event = {
        id: value.slug,
        verb: `UNSET`,
        object: true,
        type: `Belief`,
      };
      const prevBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug !== value.slug);
      heldBeliefs.set([...prevBeliefs]);
      const prevEvents = events
        .get()
        .filter((e: EventStream) => !(e.type === `Belief` && e.id === value.slug));
      events.set([...prevEvents, event]);
    }
  };

  return (
    <div className="block mt-3 w-fit">
      <button
        type="button"
        onClick={handleClick}
        className={classNames(
          selected.id === 0
            ? isOtherSelected
              ? `bg-gray-300 hover:bg-lime-200 ring-gray-500`
              : `bg-gray-100 hover:bg-orange-200 ring-orange-500`
            : `bg-gray-100 ring-lime-500`,
          `rounded-md px-3 py-2 text-lg text-black shadow-sm ring-1 ring-inset`
        )}
      >
        <div className="flex items-center">
          <span
            aria-label="Color swatch for belief"
            className={classNames(
              `motion-safe:animate-pulse`,
              selected.color || (isOtherSelected ? `bg-gray-500` : `bg-orange-500`),
              `inline-block h-2 w-2 flex-shrink-0 rounded-full`
            )}
          />
          <span className="ml-3 block truncate">{thisTitle}</span>
        </div>
      </button>
    </div>
  );
};

export const IdentifyAs = ({
  value,
  classNames = "",
  readonly = false,
}: {
  value: { slug: string; target: string; extra: string };
  classNames: string;
  readonly?: boolean;
}) => {
  const targets =
    typeof value.target === `string` ? value.target.split(",").map((t) => t.trim()) : value.target;
  const extra = value && typeof value.extra === `string` ? value.extra : null;
  const noprompt = extra === ``;

  return (
    <>
      {extra ? <span className={classNames}>{extra}</span> : null}
      <div className="flex flex-wrap gap-2">
        {targets.map((target, index) => (
          <SingleIdentifyAs
            key={`${value.slug}-${index}`}
            value={{ ...value, target }}
            target={target}
            noprompt={noprompt}
            readonly={readonly}
          />
        ))}
      </div>
    </>
  );
};
