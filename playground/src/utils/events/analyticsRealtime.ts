import {
  hourlyAnalyticsStore,
  formatHourKey,
  createEmptyHourlyContentData,
  createEmptyHourlySiteData,
} from "@/store/analytics";
import { processEpinetEvent } from "./epinetAnalytics";
import type { EventPayload } from "@/types";

/**
 * Updates the hourly analytics store with real-time event data
 * To be called from the streamEvents function
 *
 * @param payload Event payload from stream events
 * @param hasLeadId Whether the user has a lead_id (known user)
 */
export function updateAnalyticsWithEvent(payload: EventPayload, hasLeadId: boolean): void {
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyAnalyticsStore.get();

  const fingerprintId = String(payload.visit.fingerprint_id);

  if (!currentStore.siteData[currentHour]) {
    currentStore.siteData[currentHour] = createEmptyHourlySiteData();
  }

  currentStore.siteData[currentHour].totalVisits++;

  if (hasLeadId) {
    currentStore.siteData[currentHour].knownVisitors.add(fingerprintId);
  } else {
    currentStore.siteData[currentHour].anonymousVisitors.add(fingerprintId);
  }

  currentStore.lastActivity = new Date().toISOString();

  for (const event of payload.events) {
    // Process epinet data for each event
    processEpinetEvent(event, fingerprintId);

    const targetId = event.id;
    if (!targetId) continue;

    if (event.verb) {
      if (!currentStore.siteData[currentHour].eventCounts[event.verb]) {
        currentStore.siteData[currentHour].eventCounts[event.verb] = 0;
      }
      currentStore.siteData[currentHour].eventCounts[event.verb]++;
    }

    if (!targetId || !event.type) continue;

    if (event.type !== "StoryFragment" && event.type !== "Pane") continue;

    if (!currentStore.contentData[targetId]) {
      currentStore.contentData[targetId] = {};
    }

    if (!currentStore.contentData[targetId][currentHour]) {
      currentStore.contentData[targetId][currentHour] = createEmptyHourlyContentData();
    }

    const hourData = currentStore.contentData[targetId][currentHour];
    hourData.uniqueVisitors.add(fingerprintId);
    hourData.actions++;

    if (hasLeadId) {
      hourData.knownVisitors.add(fingerprintId);
    } else {
      hourData.anonymousVisitors.add(fingerprintId);
    }

    if (event.verb) {
      if (!hourData.eventCounts[event.verb]) {
        hourData.eventCounts[event.verb] = 0;
      }
      hourData.eventCounts[event.verb]++;
    }
  }

  hourlyAnalyticsStore.set(currentStore);
}

/**
 * Updates the total lead count when a new lead is created
 */
export function incrementLeadCount(): void {
  const currentStore = hourlyAnalyticsStore.get();
  currentStore.totalLeads++;
  hourlyAnalyticsStore.set(currentStore);
}
