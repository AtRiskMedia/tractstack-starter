import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { storySteps } from "../../store/events";
import type { StoryStep } from "../../types";

export const Close = () => {
  const [goto, setGoto] = useState(``);
  const $lastStep = useStore(storySteps);

  useEffect(() => {
    const lastSteps = $lastStep.filter((e: StoryStep) => e.type !== `ContextPane`);
    const lastStep = lastSteps.length ? lastSteps.at(-1) : null;
    setGoto(
      lastStep && typeof lastStep.slug === `string` && lastStep.slug.length ? lastStep.slug : ``
    );
  }, [$lastStep]);

  return (
    <div className="text-center py-12 text-2xl md:text-3xl">
      <a
        href={`/${goto}`}
        className="px-3.5 py-2.5 bg-myblack text-white rounded-lg hover:rotate-1 hover:bg-myorange"
      >
        {goto ? <span>Close</span> : <span>Home</span>}
      </a>
    </div>
  );
};
