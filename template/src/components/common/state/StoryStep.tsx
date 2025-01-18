import { useEffect } from "react";
import { events, storySteps } from "@/store/events";

interface AddStoryStepProps {
  id: string;
  slug: string;
  title: string;
  isContextPane: boolean;
}

const AddStoryStep = ({ id, slug, title, isContextPane }: AddStoryStepProps) => {
  useEffect(() => {
    const newStep = {
      id,
      slug,
      title,
      type: isContextPane ? "Pane" : "StoryFragment",
    };
    const currentSteps = storySteps.get();
    const isFirstStep = currentSteps.length === 0;

    storySteps.set([...currentSteps, newStep]);

    // Always create page view event
    const pageViewEvent = {
      id,
      type: isContextPane ? "Pane" : "StoryFragment",
      verb: "PAGEVIEWED",
    };

    if (isFirstStep) {
      // If this is the first step, also create an entered event
      const enteredEvent = {
        id,
        type: isContextPane ? "Pane" : "StoryFragment",
        verb: "ENTERED",
      };

      // Add both events to the store
      events.set([...events.get(), enteredEvent, pageViewEvent]);
    } else {
      // Just add the page view event
      events.set([...events.get(), pageViewEvent]);
    }
  }, [id]);

  return null;
};

export default AddStoryStep;
