import { hourlyEpinetStore, formatHourKey, createEmptyHourlyEpinetData } from "@/store/analytics";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { getHourKeysForTimeRange } from "@/store/analytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import type {
  EventStream,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
  ComputedEpinet,
  ComputedEpinetLink,
  ComputedEpinetNode,
  APIContext,
} from "@/types";

const VERBOSE = false;

/**
 * Find the most recent node a user has visited in an epinet
 */
export function findUserPreviousNode(
  epinetId: string,
  fingerprintId: string,
  context?: APIContext
): string | undefined {
  const tenantId = context?.locals?.tenant?.id || "default";
  const store = hourlyEpinetStore.get();
  const epinetData = store.data[tenantId]?.[epinetId];

  if (VERBOSE)
    console.log(
      "[DEBUG-TENANT] findUserPreviousNode epinetData for tenantId:",
      tenantId,
      "epinetId:",
      epinetId
    );

  if (!epinetData) return undefined;

  // Get current hour and the previous hour for recency
  const currentHour = formatHourKey(new Date());
  const prevDate = new Date();
  prevDate.setHours(prevDate.getHours() - 1);
  const prevHour = formatHourKey(prevDate);

  // Check current hour first
  if (epinetData[currentHour]) {
    // Find any nodes the user has visited in the current hour
    for (const [nodeId, nodeData] of Object.entries(epinetData[currentHour].steps)) {
      if (nodeData.visitors.has(fingerprintId)) {
        return nodeId;
      }
    }
  }

  // Check previous hour next
  if (epinetData[prevHour]) {
    for (const [nodeId, nodeData] of Object.entries(epinetData[prevHour].steps)) {
      if (nodeData.visitors.has(fingerprintId)) {
        return nodeId;
      }
    }
  }

  // No recent activity found
  return undefined;
}

/**
 * Update the hourly epinet data with a new user step and transition
 */
export function updateEpinetHourlyData(
  fingerprintId: string,
  epinetId: string,
  nodeId: string,
  nodeName: string,
  fromNodeId?: string,
  context?: APIContext
): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentHour = formatHourKey(new Date());
  const currentStore = hourlyEpinetStore.get();

  // Initialize data structures if needed
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

  // Initialize or update step data
  if (!hourData.steps[nodeId]) {
    hourData.steps[nodeId] = {
      visitors: new Set(),
      name: nodeName,
      stepIndex: 0, // Real-time events don't have step index; set to 0
    };
  }

  // Add visitor to this node
  hourData.steps[nodeId].visitors.add(fingerprintId);

  // Record transition if coming from a previous node
  if (fromNodeId && fromNodeId !== nodeId) {
    if (!hourData.transitions[fromNodeId]) {
      hourData.transitions[fromNodeId] = {};
    }

    if (!hourData.transitions[fromNodeId][nodeId]) {
      hourData.transitions[fromNodeId][nodeId] = {
        visitors: new Set(),
      };
    }

    hourData.transitions[fromNodeId][nodeId].visitors.add(fingerprintId);
  }

  // Update store
  currentStore.data[tenantId][epinetId][currentHour] = hourData;
  hourlyEpinetStore.set(currentStore);
}

/**
 * Determine if an event matches a specific epinet step
 */
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
    // Check if the event verb is in the step's values array
    const verbMatch = step.values && step.values.includes(event.verb);
    if (!verbMatch) return false;

    // Check if object type matches
    if (step.objectType && step.objectType !== event.type) return false;

    // Check for specific object IDs if specified
    if (step.objectIds && step.objectIds.length > 0) {
      return step.objectIds.includes(event.id);
    }

    return true;
  }

  return false;
}

/**
 * Add an object ID to an epinet step
 */
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

    // Get all step identifiers for matching
    const stepIdentifiers = epinet.steps.map((s) => {
      const gateType = (s as any).gateType;
      const title = (s as any).title?.replace(/\s+/g, "_") || "";
      return `${gateType}-${title}`;
    });

    // Find the step that matches the step ID
    const stepIndex = stepIdentifiers.findIndex((id) => stepId.startsWith(id));
    if (stepIndex === -1) return;

    const step = epinet.steps[stepIndex];
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

/**
 * Compute a Sankey diagram from epinet data for the specified time period
 */
export function computeEpinetSankey(
  epinetId: string,
  hours: number = 168,
  context?: APIContext
): ComputedEpinet | null {
  const tenantId = context?.locals?.tenant?.id || "default";

  const epinetStore = hourlyEpinetStore.get();
  const epinetData = epinetStore.data[tenantId]?.[epinetId];

  if (VERBOSE) {
    console.log(
      `[DEBUG-EPINET] computeEpinetSankey for tenant:${tenantId}, epinetId:${epinetId}, found data:`,
      epinetData ? "exists" : "null",
      "store contains tenants:",
      Object.keys(epinetStore.data),
      "tenant data contains epinets:",
      epinetStore.data[tenantId] ? Object.keys(epinetStore.data[tenantId]) : "none"
    );
  }

  if (!epinetData) {
    return null;
  }

  const hourKeys = getHourKeysForTimeRange(hours);

  // Build visitor count data by node
  const nodeCounts: Record<string, Set<string>> = {};
  const nodeNames: Record<string, string> = {};
  const nodeStepIndices: Record<string, number> = {};
  const transitionCounts: Record<string, Record<string, Set<string>>> = {};

  // Process each hour's data
  hourKeys.forEach((hourKey) => {
    const hourData = epinetData[hourKey];
    if (!hourData) return;

    // Collect node visitor data
    Object.entries(hourData.steps).forEach(([nodeId, data]) => {
      if (!nodeCounts[nodeId]) {
        nodeCounts[nodeId] = new Set();
        nodeNames[nodeId] = data.name;
        nodeStepIndices[nodeId] = data.stepIndex;
      }

      data.visitors.forEach((visitor) => {
        nodeCounts[nodeId].add(visitor);
      });
    });

    // Collect transition data
    Object.entries(hourData.transitions).forEach(([fromNode, toNodes]) => {
      if (!transitionCounts[fromNode]) {
        transitionCounts[fromNode] = {};
      }

      Object.entries(toNodes).forEach(([toNode, data]) => {
        if (!transitionCounts[fromNode][toNode]) {
          transitionCounts[fromNode][toNode] = new Set();
        }

        data.visitors.forEach((visitor) => {
          transitionCounts[fromNode][toNode].add(visitor);
        });
      });
    });
  });

  // Sort nodes by count to keep the most significant ones
  const sortedNodes = Object.entries(nodeCounts)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 20); // Limit to 20 most active nodes for readability

  // Convert node data to nodes array
  const nodes: ComputedEpinetNode[] = sortedNodes.map(([nodeId]) => ({
    name: nodeNames[nodeId] || nodeId,
    id: nodeId, // Include the node ID for reference
  }));

  // Create a map of node IDs to indices in the nodes array
  const nodeIndexMap: Record<string, number> = {};
  nodes.forEach((_, index) => {
    const nodeId = sortedNodes[index][0];
    nodeIndexMap[nodeId] = index;
  });

  // Convert transition data to links array
  const links: ComputedEpinetLink[] = [];
  Object.entries(transitionCounts).forEach(([fromNode, toNodes]) => {
    const sourceIndex = nodeIndexMap[fromNode];
    if (sourceIndex === undefined) return; // Skip nodes not in our top nodes

    Object.entries(toNodes).forEach(([toNode, visitors]) => {
      const targetIndex = nodeIndexMap[toNode];
      if (targetIndex === undefined) return; // Skip nodes not in our top nodes

      // Only include links with a minimum number of visitors for clarity
      if (visitors.size >= 1) {
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: visitors.size,
        });
      }
    });
  });

  if (VERBOSE) {
    console.log(
      `[DEBUG-EPINET] Sankey computed for epinet:${epinetId}, nodes: ${nodes.length}, links: ${links.length}`
    );
  }

  return {
    id: epinetId,
    title: "Epinet Flow",
    nodes,
    links,
  };
}

/**
 * Compute epinet data for multiple time periods
 */
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

/**
 * Get epinet metrics for an epinet
 */
export async function getEpinetMetrics(
  id: string,
  context?: APIContext
): Promise<ComputedEpinet | null> {
  return computeEpinetSankey(id, 168, context);
}
