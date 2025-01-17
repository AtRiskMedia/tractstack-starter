import { tursoClient } from "../client";
import { processEventStream } from "@/utils/visit/processEventStream.ts";
import type { EventPayload, EventStream, Referrer } from "@/types.ts";

export async function streamEvents(payload: {
  fingerprint?: string;
  visitId?: string;
  events: EventStream[];
  referrer?: Referrer;
}) {
  const client = await tursoClient.getClient();
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
