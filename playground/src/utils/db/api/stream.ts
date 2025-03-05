import { tursoClient } from "../client";
import { processEventStream } from "@/utils/events/processEventStream.ts";
import type { EventPayload, EventStream, Referrer } from "@/types.ts";
import type { APIContext } from "@/types";

export async function streamEvents(
  payload: {
    fingerprint?: string;
    visitId?: string;
    events: EventStream[];
    referrer?: Referrer;
  },
  context?: APIContext
): Promise<{ message: string }> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    throw new Error("No database connection");
  }

  const { fingerprint: fingerprintId, visitId, events, referrer } = payload;

  if (!fingerprintId || !visitId) {
    throw new Error("Visit not registered!");
  }

  if (!events || !Array.isArray(events)) {
    throw new Error("Invalid event payload structure");
  }

  const eventPayload: EventPayload = {
    events,
    referrer,
    visit: {
      fingerprint_id: fingerprintId,
      visit_id: visitId,
    },
  };

  await processEventStream(client, eventPayload);

  return {
    message: "Events processed successfully",
  };
}
