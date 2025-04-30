import {
  hourlyAnalyticsStore,
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyContentData,
  createEmptyHourlySiteData,
} from "@/store/analytics";
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
    const targetId = event.id;
    if (!targetId) continue;

    if (event.verb === "CLICKED") {
      currentStore.siteData[currentHour].clickedEvents++;
    } else if (event.verb === "ENTERED") {
      currentStore.siteData[currentHour].enteredEvents++;
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

    if (event.verb === "CLICKED") {
      hourData.clickedEvents++;
    } else if (event.verb === "ENTERED") {
      hourData.enteredEvents++;
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

/**
 * Updates epinet data based on belief actions or page transitions
 */
export function updateEpinetData(
  fingerprintId: string,
  epinetId: string,
  stepId: string,
  fromStepId?: string
): void {
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyEpinetStore.get();

  if (!currentStore.data[epinetId]) {
    currentStore.data[epinetId] = {};
  }

  if (!currentStore.data[epinetId][currentHour]) {
    currentStore.data[epinetId][currentHour] = {
      steps: {},
      transitions: {},
    };
  }

  if (!currentStore.data[epinetId][currentHour].steps[stepId]) {
    currentStore.data[epinetId][currentHour].steps[stepId] = {
      visitors: new Set(),
    };
  }

  currentStore.data[epinetId][currentHour].steps[stepId].visitors.add(fingerprintId);

  if (fromStepId) {
    if (!currentStore.data[epinetId][currentHour].transitions[fromStepId]) {
      currentStore.data[epinetId][currentHour].transitions[fromStepId] = {};
    }

    if (!currentStore.data[epinetId][currentHour].transitions[fromStepId][stepId]) {
      currentStore.data[epinetId][currentHour].transitions[fromStepId][stepId] = {
        visitors: new Set(),
      };
    }

    currentStore.data[epinetId][currentHour].transitions[fromStepId][stepId].visitors.add(
      fingerprintId
    );
  }

  hourlyEpinetStore.set(currentStore);
}
