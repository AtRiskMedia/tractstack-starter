import { auth } from "../../store/auth";
import { referrer } from "../../store/auth";
import type { EventStream } from "../../types";

export async function eventSync(payload: EventStream[]) {
  const authPayload = auth.get();

  // Convert each event to the expected format
  const events = payload.map((e) => {
    const event: EventStream = {
      id: e.id,
      type: e.type,
      verb: e.verb,
      ...(typeof e.object === `string` ? { object: e.object } : {}),
    };

    // Only add optional fields if they exist
    if (e.duration) event.duration = e.duration;
    if (e.object !== undefined) event.object = e.object;

    return event;
  });

  const ref = referrer.get();
  const apiPayload = {
    events,
    referrer: ref.httpReferrer !== `` ? ref : undefined,
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
    return true;
  } catch (error) {
    console.error("Error syncing events:", error);
    return false;
  }
}
