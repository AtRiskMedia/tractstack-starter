import { hourlyEpinetStore, formatHourKey, createEmptyHourlyEpinetData } from "@/store/analytics";
import type {
  EventStream,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
  ComputedEpinet,
  ComputedEpinetLink,
} from "@/types";
import { getHourKeysForTimeRange } from "@/store/analytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import type { APIContext } from "@/types";

/**
 * Match an event to the appropriate epinet steps
 * This is called from the event stream processor to track epinet transitions
 *
 * Made synchronous to avoid adding async/await throughout the event handling chain
 * Uses cached epinets instead of fetching from database each time
 *
 * @param event The event that occurred
 * @param fingerprintId The fingerprint of the user
 */
export function processEpinetEvent(event: EventStream, fingerprintId: string): void {
  const epinetStore = hourlyEpinetStore.get();
  const epinets = Object.keys(epinetStore.data).map((id) => ({
    id,
    steps: [],
  }));

  if (epinets.length === 0) return;

  for (const epinet of epinets) {
    // Find the user's previous step in this epinet
    const previousStepId = findUserPreviousStep(epinet.id, fingerprintId);

    // Process only based on event and previous steps - full epinet definitions
    // will be used in the async loadHourlyEpinetData function

    // If we have previous step data, update transitions based on the new event
    if (previousStepId) {
      // We use a simpler approach here - just record the event as a step,
      // and the full analysis will happen in the hourly loader
      const currentStepId = `${event.type}-${event.id}`;

      updateEpinetHourlyData(fingerprintId, epinet.id, currentStepId, previousStepId);
    }
  }
}

/**
 * Find the most recent step a user reached in a specific epinet
 */
function findUserPreviousStep(epinetId: string, fingerprintId: string): string | undefined {
  const store = hourlyEpinetStore.get();
  const epinetData = store.data[epinetId];
  if (!epinetData) return undefined;

  // Start from most recent hour and work backwards
  const hourKeys = Object.keys(epinetData).sort().reverse();

  for (const hourKey of hourKeys) {
    const hourData = epinetData[hourKey];

    // Check each step to see if this user visited it
    for (const [stepId, stepData] of Object.entries(hourData.steps)) {
      if (stepData.visitors.has(fingerprintId)) {
        return stepId;
      }
    }
  }

  return undefined;
}

/**
 * Generate a stable ID for an epinet step based on its properties
 * This ensures steps can be consistently identified even across restarts
 */
function getStableStepId(
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction
): string {
  const parts: string[] = [step.gateType];

  if (step.title) {
    parts.push(step.title.replace(/\s+/g, "_"));
  }

  if (step.gateType === "belief" || step.gateType === "identifyAs") {
    if (step.values?.length) {
      parts.push(step.values.join("_"));
    }
  } else if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
    parts.push(String(step.objectType));
    if (step.objectIds?.length) {
      parts.push(step.objectIds.join("_"));
    }
  }

  return parts.join("-");
}

/**
 * Match an event to a specific epinet step
 */
export function matchEventToStep(
  event: EventStream,
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction
): boolean {
  // Match belief events
  if (event.type === "Belief" && step.gateType === "belief") {
    // The event.id for beliefs is the slug
    return step.values.includes(event.verb);
  }

  // Match identifyAs events
  if (event.type === "Belief" && step.gateType === "identifyAs") {
    // For identifyAs, check both belief slug and value
    return step.values.includes(String(event.object));
  }

  // Match commitment/conversion actions
  if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
    // For actions, check verb, type, and ID match
    const validVerb =
      step.gateType === "commitmentAction"
        ? event.verb === "CLICKED" || event.verb === "ENTERED"
        : event.verb === "SUBMITTED" || event.verb === "CONVERTED";

    if (!validVerb) return false;

    // If objectIds are specified, check for direct match
    if (step.objectIds && step.objectIds.length > 0) {
      return step.objectIds.includes(event.id);
    }

    // Otherwise match by objectType
    if (step.objectType === event.type) {
      // For ContextPage, we should check if it's a context pane
      // Since this requires async DB access, we're making a simplification
      // for real-time path: we'll match on type, and then step learning will
      // add the specific IDs to the step for future direct matching
      return true;
    }
  }

  return false;
}

/**
 * Add an object ID to an epinet step for future direct matching
 */
export async function addObjectToEpinetStep(
  epinetId: string,
  stepId: string,
  objectId: string,
  context?: APIContext
): Promise<void> {
  try {
    // Get the current epinet
    const epinets = await getAllEpinets(context);
    const epinet = epinets.find((e) => e.id === epinetId);
    if (!epinet) return;

    // Find the matching step
    const step = epinet.steps.find((s) => getStableStepId(s) === stepId);
    if (!step) return;

    // Only proceed for action steps
    if (step.gateType !== "commitmentAction" && step.gateType !== "conversionAction") return;

    // Initialize objectIds if needed
    if (!step.objectIds) {
      step.objectIds = [];
    }

    // Add the objectId if it's not already there
    if (!step.objectIds.includes(objectId)) {
      step.objectIds.push(objectId);

      // Import the upsert function here to avoid circular dependencies
      const { upsertEpinet } = await import("@/utils/db/api/upsertEpinet");

      // Save the updated epinet
      await upsertEpinet(epinet, context);
    }
  } catch (error) {
    console.error("Error adding object to epinet step:", error);
  }
}

/**
 * Updates hourly epinet data for a user transitioning through steps
 */
export function updateEpinetHourlyData(
  fingerprintId: string,
  epinetId: string,
  stepId: string,
  fromStepId?: string
): void {
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyEpinetStore.get();

  // Initialize if needed
  if (!currentStore.data[epinetId]) {
    currentStore.data[epinetId] = {};
  }

  if (!currentStore.data[epinetId][currentHour]) {
    currentStore.data[epinetId][currentHour] = createEmptyHourlyEpinetData();
  }

  // Update step count
  if (!currentStore.data[epinetId][currentHour].steps[stepId]) {
    currentStore.data[epinetId][currentHour].steps[stepId] = {
      visitors: new Set(),
    };
  }

  currentStore.data[epinetId][currentHour].steps[stepId].visitors.add(fingerprintId);

  // Update transition if applicable
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

/**
 * Compute a sankey diagram from epinet data for a specific time range
 */
export function computeEpinetSankey(
  epinetId: string,
  hours: number = 168 // Default 7 days
): ComputedEpinet | null {
  const epinetStore = hourlyEpinetStore.get();
  const epinetData = epinetStore.data[epinetId];

  if (!epinetData) {
    return null;
  }

  const hourKeys = getHourKeysForTimeRange(hours);

  // Aggregate step data
  const stepCounts: Record<string, Set<string>> = {};
  const transitionCounts: Record<string, Record<string, Set<string>>> = {};

  // Process each hour in the selected time range
  hourKeys.forEach((hourKey) => {
    const hourData = epinetData[hourKey];
    if (!hourData) return;

    // Aggregate steps
    Object.entries(hourData.steps).forEach(([stepId, data]) => {
      if (!stepCounts[stepId]) {
        stepCounts[stepId] = new Set();
      }

      data.visitors.forEach((visitor) => {
        stepCounts[stepId].add(visitor);
      });
    });

    // Aggregate transitions
    Object.entries(hourData.transitions).forEach(([fromStep, toSteps]) => {
      if (!transitionCounts[fromStep]) {
        transitionCounts[fromStep] = {};
      }

      Object.entries(toSteps).forEach(([toStep, data]) => {
        if (!transitionCounts[fromStep][toStep]) {
          transitionCounts[fromStep][toStep] = new Set();
        }

        data.visitors.forEach((visitor) => {
          transitionCounts[fromStep][toStep].add(visitor);
        });
      });
    });
  });

  // Convert to Sankey format
  const nodes = Object.keys(stepCounts).map((id) => ({
    name: id, // Would need to map to actual step names
  }));

  const links: ComputedEpinetLink[] = [];
  Object.entries(transitionCounts).forEach(([source, targets]) => {
    Object.entries(targets).forEach(([target, visitors]) => {
      const sourceIndex = nodes.findIndex((n) => n.name === source);
      const targetIndex = nodes.findIndex((n) => n.name === target);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: visitors.size,
        });
      }
    });
  });

  return {
    id: epinetId,
    title: "Epinet Flow", // Would need to get actual title
    nodes,
    links,
  };
}

/**
 * Compute all time ranges (daily, weekly, monthly) for an epinet
 */
export function computeAllEpinetRanges(epinetId: string): {
  daily: ComputedEpinet | null;
  weekly: ComputedEpinet | null;
  monthly: ComputedEpinet | null;
} {
  return {
    daily: computeEpinetSankey(epinetId, 24),
    weekly: computeEpinetSankey(epinetId, 168),
    monthly: computeEpinetSankey(epinetId, 672),
  };
}

/**
 * Public API endpoint for retrieving epinet sankey data
 * Compatible with [tursoOperation].ts API structure
 */
export async function getEpinetMetrics(id: string): Promise<ComputedEpinet | null> {
  return computeEpinetSankey(id, 168);
}
