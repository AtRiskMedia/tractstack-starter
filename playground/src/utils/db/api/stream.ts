import { tursoClient } from "../client";
import { processEventStream } from "@/utils/events/processEventStream.ts";
import { updateAnalyticsWithEvent } from "@/utils/events/analyticsRealtime.ts";
import type { APIContext, EventPayload, EventStream, Referrer } from "@/types.ts";

export async function streamEvents(
  payload: {
    fingerprint?: string;
    visitId?: string;
    isKnownLead?: boolean;
    events: EventStream[];
    referrer?: Referrer;
  },
  context?: APIContext
): Promise<{ message: string }> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    throw new Error("No database connection");
  }

  const { fingerprint: fingerprintId, visitId, events, referrer, isKnownLead } = payload;

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
  updateAnalyticsWithEvent(eventPayload, !!isKnownLead, context);

  return {
    message: "Events processed successfully",
  };
}
