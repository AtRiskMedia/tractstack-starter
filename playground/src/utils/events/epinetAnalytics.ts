import { hourlyEpinetStore, formatHourKey, createEmptyHourlyEpinetData } from "@/store/analytics";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import type {
  EventStream,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
  ComputedEpinet,
  ComputedEpinetLink,
  APIContext,
} from "@/types";
import { getHourKeysForTimeRange } from "@/store/analytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";

const VERBOSE = false;

export function processEpinetEvent(
  event: EventStream,
  fingerprintId: string,
  context?: APIContext
): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  if (VERBOSE) console.log("[DEBUG-TENANT] processEpinetEvent tenantId:", tenantId);
  const epinetStore = hourlyEpinetStore.get();
  const tenantData = epinetStore.data[tenantId] || {};
  const epinets = Object.keys(tenantData).map((id) => ({
    id,
    steps: [],
  }));
  if (VERBOSE)
    console.log(
      "[DEBUG-TENANT] processEpinetEvent epinets:",
      epinets.map((e) => e.id)
    );

  if (epinets.length === 0) return;

  for (const epinet of epinets) {
    const previousStepId = findUserPreviousStep(epinet.id, fingerprintId, context);
    const currentStepId = `${epinet.id}-${event.verb}_${event.type}-${event.id}`;

    updateEpinetHourlyData(fingerprintId, epinet.id, currentStepId, previousStepId, context);
  }
}

export function findUserPreviousStep(
  epinetId: string,
  fingerprintId: string,
  context?: APIContext
): string | undefined {
  const tenantId = context?.locals?.tenant?.id || "default";
  const store = hourlyEpinetStore.get();
  const epinetData = store.data[tenantId]?.[epinetId];
  if (VERBOSE)
    console.log(
      "[DEBUG-TENANT] findUserPreviousStep epinetData for tenantId:",
      tenantId,
      "epinetId:",
      epinetId
    );
  if (!epinetData) return undefined;

  const hourKeys = Object.keys(epinetData).sort().reverse();

  for (const hourKey of hourKeys) {
    const hourData = epinetData[hourKey];
    for (const [stepId, stepData] of Object.entries(hourData.steps)) {
      if (stepData.visitors.has(fingerprintId)) {
        return stepId;
      }
    }
  }

  return undefined;
}

export function updateEpinetHourlyData(
  fingerprintId: string,
  epinetId: string,
  stepId: string,
  fromStepId?: string,
  context?: APIContext
): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyEpinetStore.get();

  if (!currentStore.data[tenantId]) {
    currentStore.data[tenantId] = {};
  }

  if (!currentStore.data[tenantId][epinetId]) {
    currentStore.data[tenantId][epinetId] = {};
  }

  if (!currentStore.data[tenantId][epinetId][currentHour]) {
    currentStore.data[tenantId][epinetId][currentHour] = createEmptyHourlyEpinetData();
  }

  const hourData = currentStore.data[tenantId][epinetId][currentHour];

  if (!hourData.steps[stepId]) {
    hourData.steps[stepId] = {
      visitors: new Set(),
    };
  }

  hourData.steps[stepId].visitors.add(fingerprintId);

  if (fromStepId) {
    if (!hourData.transitions[fromStepId]) {
      hourData.transitions[fromStepId] = {};
    }

    if (!hourData.transitions[fromStepId][stepId]) {
      hourData.transitions[fromStepId][stepId] = {
        visitors: new Set(),
      };
    }

    hourData.transitions[fromStepId][stepId].visitors.add(fingerprintId);
  }

  currentStore.data[tenantId][epinetId][currentHour] = hourData;
  hourlyEpinetStore.set(currentStore);
}

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

export function matchEventToStep(
  event: EventStream,
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction
): boolean {
  if (event.type === "Belief" && step.gateType === "belief") {
    return step.values.includes(event.verb);
  }

  if (event.type === "Belief" && step.gateType === "identifyAs") {
    return step.values.includes(String(event.object));
  }

  if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
    const validVerb =
      step.gateType === "commitmentAction"
        ? event.verb === "CLICKED" || event.verb === "ENTERED"
        : event.verb === "SUBMITTED" || event.verb === "CONVERTED";

    if (!validVerb) return false;

    if (step.objectIds && step.objectIds.length > 0) {
      return step.objectIds.includes(event.id);
    }

    if (step.objectType === event.type) {
      return true;
    }
  }

  return false;
}

export async function addObjectToEpinetStep(
  epinetId: string,
  stepId: string,
  objectId: string,
  context?: APIContext
): Promise<void> {
  try {
    const epinets = await getAllEpinets(context);
    const epinet = epinets.find((e) => e.id === epinetId);
    if (!epinet) return;

    const step = epinet.steps.find((s) => getStableStepId(s) === stepId);
    if (!step) return;

    if (step.gateType !== "commitmentAction" && step.gateType !== "conversionAction") return;

    if (!step.objectIds) {
      step.objectIds = [];
    }

    if (!step.objectIds.includes(objectId)) {
      step.objectIds.push(objectId);

      await upsertEpinet(epinet, context);
    }
  } catch (error) {
    console.error("Error adding object to epinet step:", error);
  }
}

export function computeEpinetSankey(
  epinetId: string,
  hours: number = 168,
  context?: APIContext
): ComputedEpinet | null {
  const tenantId = context?.locals?.tenant?.id || "default";
  const epinetStore = hourlyEpinetStore.get();
  const epinetData = epinetStore.data[tenantId]?.[epinetId];
  if (VERBOSE)
    console.log(
      `[DEBUG-EPINET] computeEpinetSankey for tenant:${tenantId}, epinetId:${epinetId}, found data:`,
      epinetData ? "exists" : "null",
      "store contains tenants:",
      Object.keys(epinetStore.data),
      "tenant data contains epinets:",
      epinetStore.data[tenantId] ? Object.keys(epinetStore.data[tenantId]) : "none"
    );

  if (!epinetData) {
    return null;
  }

  const hourKeys = getHourKeysForTimeRange(hours);

  const stepCounts: Record<string, Set<string>> = {};
  const transitionCounts: Record<string, Record<string, Set<string>>> = {};

  hourKeys.forEach((hourKey) => {
    const hourData = epinetData[hourKey];
    if (!hourData) return;

    Object.entries(hourData.steps).forEach(([stepId, data]) => {
      if (!stepCounts[stepId]) {
        stepCounts[stepId] = new Set();
      }

      data.visitors.forEach((visitor) => {
        stepCounts[stepId].add(visitor);
      });
    });

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

  const nodes = Object.keys(stepCounts).map((id) => ({
    name: id,
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
    title: "Epinet Flow",
    nodes,
    links,
  };
}

export function computeAllEpinetRanges(
  epinetId: string,
  context?: APIContext
): {
  daily: ComputedEpinet | null;
  weekly: ComputedEpinet | null;
  monthly: ComputedEpinet | null;
} {
  return {
    daily: computeEpinetSankey(epinetId, 24, context),
    weekly: computeEpinetSankey(epinetId, 168, context),
    monthly: computeEpinetSankey(epinetId, 672, context),
  };
}

export async function getEpinetMetrics(
  id: string,
  context?: APIContext
): Promise<ComputedEpinet | null> {
  return computeEpinetSankey(id, 168, context);
}
