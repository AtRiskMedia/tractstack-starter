import type { ContentMap, Events, EventNodes, EventStream } from "../../types";
import { contentMap } from "../../store/events";
import { referrer } from "../../store/auth";

export async function eventSync(payload: EventStream[]) {
  const map = contentMap.get();
  const events: Events = {};
  const nodes: EventNodes = {};

  // loop through events to generate nodes object
  payload.forEach((e: EventStream, idx: number) => {
    // prepare nodes + push events
    switch (e.type) {
      case `PaneClicked`: {
        const targetId = map.filter((m: ContentMap) => m.slug === e.targetSlug).at(0)!.id;
        const thisEvent = {
          id: e.id,
          type: `Pane`,
          verb: `CLICKED`,
          parentId: targetId,
        };
        const matchPane = map.filter((m: ContentMap) => m.id === e.id).at(0)!;
        const matchStoryFragment = map.filter((m: ContentMap) => m.slug === e.targetSlug).at(0)!;
        nodes[matchPane.id] = {
          type: `Pane`,
          title: matchPane.title,
          slug: matchPane.slug,
        };
        nodes[matchStoryFragment.id] = {
          type: `StoryFragment`,
          title: matchStoryFragment.title,
          slug: matchStoryFragment.slug,
          parentId: matchStoryFragment.parentId,
        };
        if (matchStoryFragment?.parentId)
          nodes[matchStoryFragment.parentId] = {
            type: `TractStack`,
            title: matchStoryFragment.parentTitle,
            slug: matchStoryFragment.parentSlug,
          };
        events[idx] = thisEvent;
        break;
      }

      case `Pane`: {
        const thisEvent = { ...e };
        const matchPane = map.filter((m: ContentMap) => m.id === e.id).at(0)!;
        if (thisEvent.id === thisEvent.parentId) {
          // context pane
          nodes[matchPane.id] = {
            type: `Pane`,
            title: matchPane.title,
            slug: matchPane.slug,
          };
          delete thisEvent.parentId;
        } else {
          const matchStoryFragment = map.filter((m: ContentMap) => m.id === e.parentId).at(0)!;
          nodes[matchPane.id] = {
            type: `Pane`,
            title: matchPane.title,
            slug: matchPane.slug,
            parentId: matchStoryFragment?.id || undefined,
          };
          if (matchStoryFragment) {
            nodes[matchStoryFragment.id] = {
              type: `StoryFragment`,
              title: matchStoryFragment.title,
              slug: matchStoryFragment.slug,
              parentId: matchStoryFragment.parentId,
            };
            if (matchStoryFragment?.parentId)
              nodes[matchStoryFragment.parentId] = {
                type: `TractStack`,
                title: matchStoryFragment.parentTitle,
                slug: matchStoryFragment.parentSlug,
              };
          }
        }
        events[idx] = thisEvent;
        break;
      }

      case `StoryFragment`: {
        const thisEvent = { ...e };
        const matchStoryFragment = map.filter((m: ContentMap) => m.id === e.id).at(0)!;
        nodes[matchStoryFragment.id] = {
          type: `StoryFragment`,
          title: matchStoryFragment.title,
          slug: matchStoryFragment.slug,
          parentId: matchStoryFragment.parentId,
        };
        if (matchStoryFragment?.parentId)
          nodes[matchStoryFragment.parentId] = {
            type: `TractStack`,
            title: matchStoryFragment.parentTitle,
            slug: matchStoryFragment.parentSlug,
          };
        events[idx] = thisEvent;
        break;
      }

      case `Impression`: {
        const thisEvent = { ...e };
        const matchStoryFragment = map.filter((m: ContentMap) => m.id === e.parentId).at(0)!;
        const matchStoryFragmentTarget = map
          .filter((m: ContentMap) => m.slug === e.targetSlug)
          .at(0)!;
        nodes[e.id] = {
          type: `Impression`,
          parentId: matchStoryFragment.id,
          title: e.title,
        };
        nodes[matchStoryFragment.id] = {
          type: `StoryFragment`,
          title: matchStoryFragment.title,
          slug: matchStoryFragment.slug,
          parentId: matchStoryFragment.parentId,
        };
        if (matchStoryFragment?.parentId)
          nodes[matchStoryFragment.parentId] = {
            type: `TractStack`,
            title: matchStoryFragment.parentTitle,
            slug: matchStoryFragment.parentSlug,
          };
        nodes[matchStoryFragmentTarget.id] = {
          type: `StoryFragment`,
          title: matchStoryFragmentTarget.title,
          slug: matchStoryFragmentTarget.slug,
          parentId: matchStoryFragmentTarget.parentId,
        };
        if (matchStoryFragmentTarget?.parentId)
          nodes[matchStoryFragmentTarget.parentId] = {
            type: `TractStack`,
            title: matchStoryFragmentTarget.parentTitle,
            slug: matchStoryFragmentTarget.parentSlug,
          };
        delete thisEvent.targetSlug;
        delete thisEvent.title;
        thisEvent.targetId = matchStoryFragmentTarget.id;
        events[idx] = thisEvent;
        break;
      }

      case `Belief`: {
        const thisEvent = { ...e };
        events[idx] = thisEvent;
        nodes[e.id] = {
          type: `Belief`,
          title: e.id,
        };
        break;
      }

      default:
        console.log(`miss on eventNode:`, e.type);
    }
  });

  const ref = referrer.get();
  const refPayload = ref.httpReferrer !== `` ? ref : {};
  const options = {
    nodes,
    events,
    referrer: refPayload,
  };

  if (!import.meta.env.PROD) {
    console.log(`dev mode. skipping event pushPayload:`, options);
    return true;
  }

  console.log(`must rewire /events/stream`);
  //const response = null;
  //await fetchWithAuth("/events/stream", {
  //  method: "POST",
  //  body: JSON.stringify({ ...options }),
  //});
  //if (response.message && !response.error) return true;

  return false;
}
