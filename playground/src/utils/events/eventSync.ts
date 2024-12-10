import type { ContentMap, EventStream } from "../../types";
import { contentMap } from "../../store/events";
import { referrer } from "../../store/auth";

export async function eventSync(payload: EventStream[]) {
  const map = contentMap.get();
  const events: EventStream[] = [];

  // Convert each event to the expected format
  payload.forEach((e: EventStream) => {
    switch (e.type) {
      case `PaneClicked`: {
        const targetId = map.filter((m: ContentMap) => m.slug === e.targetSlug).at(0)!.id;
        events.push({
          id: e.id,
          type: "Pane",
          verb: "CLICKED",
          parentId: targetId,
        });
        break;
      }

      case `Pane`: {
        events.push({
          id: e.id,
          type: "Pane",
          verb: e.verb,
          parentId: e.parentId !== e.id ? e.parentId : undefined,
          duration: e.duration,
        });
        break;
      }

      case `StoryFragment`: {
        events.push({
          id: e.id,
          type: "StoryFragment",
          verb: e.verb,
          parentId: e.parentId,
          duration: e.duration,
        });
        break;
      }

      case `Impression`: {
        const matchStoryFragmentTarget = map
          .filter((m: ContentMap) => m.slug === e.targetSlug)
          .at(0)!;

        events.push({
          id: e.id,
          type: "StoryFragment",
          verb: e.verb,
          parentId: e.parentId,
          targetId: matchStoryFragmentTarget.id,
        });
        break;
      }

      case `Belief`: {
        events.push({
          id: e.id,
          type: "Belief",
          verb: e.verb,
          object: e.object,
        });
        break;
      }

      default:
        console.log(`Unhandled event type:`, e.type);
    }
  });

  const ref = referrer.get();
  const apiPayload = {
    events,
    referrer: ref.httpReferrer !== `` ? ref : undefined,
  };

  //if (!import.meta.env.PROD) {
  //  console.log(`dev mode. skipping event pushPayload:`, apiPayload);
  //  return true;
  //}

  try {
    const response = await fetch("/api/turso/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    const result = await response.json();
    if (!result.success) {
      console.error("Event sync failed:", result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error syncing events:", error);
    return false;
  }
}
