import {
  hourlyAnalyticsStore,
  formatHourKey,
  createEmptyHourlyContentData,
  createEmptyHourlySiteData,
} from "@/store/analytics";
import { processEpinetEvent } from "./epinetAnalytics";
import type { EventPayload, APIContext } from "@/types";

const VERBOSE = false;

export function updateAnalyticsWithEvent(
  payload: EventPayload,
  hasLeadId: boolean,
  context?: APIContext
): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  if (VERBOSE) console.log("[DEBUG-TENANT] updateAnalyticsWithEvent tenantId:", tenantId); // Debug log
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyAnalyticsStore.get();

  if (!currentStore.data[tenantId]) {
    currentStore.data[tenantId] = {
      contentData: {},
      siteData: {},
      lastFullHour: currentHour,
      lastUpdated: Date.now(),
      totalLeads: 0,
      lastActivity: null,
      slugMap: new Map(),
    };
  }

  const tenantData = currentStore.data[tenantId];

  const fingerprintId = String(payload.visit.fingerprint_id);

  if (!tenantData.siteData[currentHour]) {
    tenantData.siteData[currentHour] = createEmptyHourlySiteData();
  }

  tenantData.siteData[currentHour].totalVisits++;

  if (hasLeadId) {
    tenantData.siteData[currentHour].knownVisitors.add(fingerprintId);
  } else {
    tenantData.siteData[currentHour].anonymousVisitors.add(fingerprintId);
  }

  tenantData.lastActivity = new Date().toISOString();

  for (const event of payload.events) {
    processEpinetEvent(event, fingerprintId, context); // Pass context

    const targetId = event.id;
    if (!targetId) continue;

    if (event.verb) {
      if (!tenantData.siteData[currentHour].eventCounts[event.verb]) {
        tenantData.siteData[currentHour].eventCounts[event.verb] = 0;
      }
      tenantData.siteData[currentHour].eventCounts[event.verb]++;
    }

    if (!targetId || !event.type) continue;

    if (event.type !== "StoryFragment" && event.type !== "Pane") continue;

    if (!tenantData.contentData[targetId]) {
      tenantData.contentData[targetId] = {};
    }

    if (!tenantData.contentData[targetId][currentHour]) {
      tenantData.contentData[targetId][currentHour] = createEmptyHourlyContentData();
    }

    const hourData = tenantData.contentData[targetId][currentHour];
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

  currentStore.data[tenantId] = tenantData;
  hourlyAnalyticsStore.set(currentStore);
}

export function incrementLeadCount(context?: APIContext): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentStore = hourlyAnalyticsStore.get();
  if (!currentStore.data[tenantId]) {
    currentStore.data[tenantId] = {
      contentData: {},
      siteData: {},
      lastFullHour: formatHourKey(new Date()),
      lastUpdated: Date.now(),
      totalLeads: 0,
      lastActivity: null,
      slugMap: new Map(),
    };
  }
  currentStore.data[tenantId].totalLeads++;
  hourlyAnalyticsStore.set(currentStore);
}
