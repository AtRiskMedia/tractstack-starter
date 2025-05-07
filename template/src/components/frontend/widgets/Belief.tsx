import { useState, useEffect } from "react";
import { Select } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import { useStore } from "@nanostores/react";
import { heldBeliefsScales, heldBeliefsTitles } from "@/utils/common/beliefs";
import { classNames } from "@/utils/common/helpers";
import { heldBeliefs } from "@/store/beliefs";
import { events } from "@/store/events";
import type { BeliefOptionDatum, BeliefDatum, EventStream } from "@/types";

// whitelist: className="bg-teal-400 bg-lime-400 bg-slate-200 bg-amber-400 bg-red-400 bg-lime-400 bg-amber-400 bg-lime-400 bg-amber-400 bg-lime-400 bg-amber-400 bg-lime-400 bg-amber-400"

export const Belief = ({
  value,
  readonly = false,
}: {
  value: { slug: string; scale: string; extra: string };
  readonly?: boolean;
}) => {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const thisScaleLookup = value.scale as keyof typeof heldBeliefsScales;
  const extra = value && typeof value.extra === `string` ? value.extra : null;
  const thisTitle = heldBeliefsTitles[thisScaleLookup];
  const thisScaleRaw = heldBeliefsScales[thisScaleLookup].sort(function (
    a: BeliefOptionDatum,
    b: BeliefOptionDatum
  ) {
    return b.id - a.id;
  });
  const start = {
    id: 0,
    slug: "0",
    name: thisTitle,
    color: `bg-myorange`,
  };
  const thisScale = [start, ...thisScaleRaw];
  const [selected, setSelected] = useState(start);

  // Create collection for Ark UI Select component
  const collection = createListCollection({
    items: thisScale,
    itemToValue: (item) => item.slug,
    itemToString: (item) => item.name,
  });

  useEffect(() => {
    if (!readonly) {
      const hasMatchingBelief = $heldBeliefsAll
        .filter((e: BeliefDatum) => e.slug === value.slug)
        .at(0);
      const knownOffset =
        typeof hasMatchingBelief?.verb === `string`
          ? thisScale.filter((e: BeliefOptionDatum) => e.slug === hasMatchingBelief.verb).at(0)
          : false;
      if (knownOffset && knownOffset?.slug) setSelected(knownOffset);
      else setSelected(start);
    }
  }, [$heldBeliefsAll, readonly]);

  const handleClick = (details: { value: string[] }) => {
    if (readonly) return false;

    const selectedSlug = details.value[0];
    const selectedOption = thisScale.find((option) => option.slug === selectedSlug);

    if (!selectedOption) return;

    setSelected(selectedOption);

    if (selectedOption.id > 0) {
      const event = {
        verb: selectedOption.slug,
        id: value.slug,
        type: `Belief`,
      };
      const belief = {
        id: value.slug,
        slug: value.slug,
        verb: selectedOption.slug,
      };
      const prevBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug !== value.slug);
      heldBeliefs.set([...prevBeliefs, belief]);
      const prevEvents = events
        .get()
        .filter((e: EventStream) => !(e.type === `Belief` && e.id === value.slug));
      events.set([...prevEvents, event]);
    } else {
      const event = {
        verb: `UNSET`,
        id: value.slug,
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

  // CSS to properly style the select items with hover and selection
  const selectItemStyles = `
    .belief-item[data-highlighted] {
      background-color: #f1f5f9; /* bg-slate-200 */
      color: #0891b2; /* text-myblue */
    }
    .belief-item[data-highlighted] .belief-indicator {
      color: #0891b2; /* text-myblue */
    }
    .belief-item[data-state="checked"] .belief-indicator {
      display: flex;
    }
    .belief-item .belief-indicator {
      display: none;
    }
    .belief-item[data-state="checked"] {
      text-decoration: underline;
    }
  `;

  return (
    <>
      <style>{selectItemStyles}</style>
      {extra ? <span className="mr-2">{extra}</span> : null}
      <div className="block mt-3 w-fit">
        <Select.Root
          collection={collection}
          value={[selected.slug]}
          onValueChange={handleClick}
          defaultValue={[start.slug]}
        >
          <Select.Control
            className={classNames(
              selected?.color ? `border-${selected.color.substring(3)}` : `bg-slate-200`,
              `relative w-full cursor-default rounded-md border bg-white text-black py-2 pl-3 pr-10 text-left shadow-sm focus:border-myorange focus:outline-none focus:ring-1 focus:ring-myorange`
            )}
          >
            <Select.Trigger className="flex w-full items-center justify-between">
              <span className="flex items-center">
                <span
                  aria-label="Color swatch for belief"
                  className={classNames(
                    `motion-safe:animate-pulse`,
                    selected?.color ? selected.color : `bg-myorange`,
                    `inline-block h-2 w-2 flex-shrink-0 rounded-full`
                  )}
                />
                <span className="ml-3 block truncate">{selected?.name || thisTitle}</span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-mylightgrey" aria-hidden="true" />
              </span>
            </Select.Trigger>
          </Select.Control>

          <Portal>
            <Select.Positioner>
              <Select.Content className="absolute mt-1 max-h-60 overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                {thisScale.map((factor) => (
                  <Select.Item
                    key={factor.id}
                    item={factor}
                    className="belief-item relative cursor-default select-none py-2 pl-3 pr-9 text-black"
                  >
                    <div className="flex items-center">
                      <span
                        className={classNames(
                          factor.color,
                          `inline-block h-2 w-2 flex-shrink-0 rounded-full`
                        )}
                        aria-hidden="true"
                      />
                      <Select.ItemText className="ml-3 block truncate">
                        {factor.name}
                      </Select.ItemText>
                    </div>

                    <Select.ItemIndicator className="belief-indicator absolute inset-y-0 right-0 flex items-center px-2 text-black">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
      </div>
    </>
  );
};
