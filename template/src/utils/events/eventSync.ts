import type { ContentMap, EventStream } from "../../types";
import { contentMap } from "../../store/events";
import { auth } from "../../store/auth";
import { referrer } from "../../store/auth";

export async function eventSync(payload: EventStream[]) {
  const authPayload = auth.get();
  const map = contentMap.get();
  const events: EventStream[] = [];
  // Get known corpus IDs from auth store
  const knownIds = new Set(
    authPayload.knownCorpusIds ? JSON.parse(authPayload.knownCorpusIds) : []
  );
  // Collect all IDs needed for this event batch
  const neededIds = new Set<string>();
  payload.forEach((e: EventStream) => {
    neededIds.add(e.id);
    if (e.parentId) {
      neededIds.add(e.parentId);
    }
    if (e.targetId) {
      neededIds.add(e.targetId);
    }
    if (e.type === "PaneClicked" && e.targetSlug) {
      const target = map.find((m: ContentMap) => m.slug === e.targetSlug);
      if (target) {
        neededIds.add(target.id);
      }
    }
  });
  // Filter content map to only required new IDs
  const filteredContentMap = map.filter(
    (item: ContentMap) => neededIds.has(item.id) && !knownIds.has(item.id)
  );

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
    contentMap: filteredContentMap.length > 0 ? filteredContentMap : undefined,
    fingerprint: authPayload?.key,
    visitId: authPayload?.visitId,
  };

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
    if (filteredContentMap.length > 0) {
      const newKnownIds = [...knownIds, ...filteredContentMap.map((item) => item.id)];
      auth.setKey("knownCorpusIds", JSON.stringify(newKnownIds));
    }
    return true;
  } catch (error) {
    console.error("Error syncing events:", error);
    return false;
  }
}
