import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Switch } from "@ark-ui/react";
import { classNames } from "@/utils/common/helpers";
import { heldBeliefs } from "@/store/beliefs";
import { events } from "@/store/events";
import type { BeliefDatum, EventStream } from "@/types";

export const ToggleBelief = ({
  belief,
  prompt,
  readonly = false,
}: {
  belief: string;
  prompt: string;
  readonly?: boolean;
}) => {
  const $heldBeliefsAll = useStore(heldBeliefs);
  const [isClient, setIsClient] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const handleClick = () => {
    if (!readonly) {
      const event = {
        verb: enabled ? `BELIEVES_NO` : `BELIEVES_YES`,
        id: belief,
        type: `Belief`,
      };
      const thisBelief = {
        id: belief,
        slug: belief,
        verb: enabled ? `BELIEVES_NO` : `BELIEVES_YES`,
      };
      const prevBeliefs = $heldBeliefsAll.filter((b: BeliefDatum) => b.slug !== belief);
      heldBeliefs.set([...prevBeliefs, thisBelief]);
      const prevEvents = events
        .get()
        .filter((e: EventStream) => !(e.type === `Belief` && e.id === belief));
      events.set([...prevEvents, event]);
    }
  };

  useEffect(() => {
    const hasMatchingBelief = $heldBeliefsAll.filter((e: BeliefDatum) => e.slug === belief).at(0);
    if (hasMatchingBelief && hasMatchingBelief?.verb)
      setEnabled(hasMatchingBelief.verb === `BELIEVES_YES`);
    else setEnabled(false);
    setIsClient(true);
  }, [$heldBeliefsAll]);

  if (!isClient) return null;

  return (
    <div className={classNames(`flex items-center mt-6`)}>
      <Switch.Root
        checked={enabled}
        onCheckedChange={handleClick}
        disabled={readonly}
        className="inline-flex items-center"
      >
        <Switch.Control
          className={classNames(
            enabled ? `bg-cyan-600` : `bg-myblue`,
            `relative inline-flex h-6 w-11 flex-shrink-0`,
            readonly ? `cursor-not-allowed opacity-50` : `cursor-pointer`,
            `rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2`
          )}
        >
          <Switch.Thumb
            className={classNames(
              enabled ? `translate-x-5` : `translate-x-0 motion-safe:animate-wig`,
              `pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out`
            )}
          />
        </Switch.Control>
        <Switch.HiddenInput />
        <div className="flex items-center h-6 ml-3">
          <Switch.Label className={readonly ? `cursor-default` : `cursor-pointer`}>
            <span>{prompt}</span>
          </Switch.Label>
        </div>
      </Switch.Root>
    </div>
  );
};
