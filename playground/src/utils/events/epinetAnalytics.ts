import { hourlyEpinetStore, formatHourKey, createEmptyHourlyEpinetData } from "@/store/analytics";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { contentMap } from "@/store/events";
import { getHourKeysForTimeRange } from "@/store/analytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import { getEventNodeId } from "@/utils/events/epinetLoader";
import { loadHourlyEpinetData, getEpinetLoadingStatus } from "@/utils/events/epinetLoader";
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

// Track computation state per tenant to avoid redundant calculations
const computationState: Record<
  string,
  {
    epinetLastComputed: Record<string, number>; // Per epinet ID
    pendingComputations: Set<string>; // Epinet IDs with pending computations
  }
> = {};

const COMPUTATION_THROTTLE_MS = 5000; // 5 seconds

/**
 * Process an event and update epinet data in real-time
 */
export function processEpinetEvent(
  event: EventStream,
  fingerprintId: string,
  context?: APIContext
): void {
  const tenantId = context?.locals?.tenant?.id || "default";
  if (VERBOSE) console.log("[DEBUG-TENANT] processEpinetEvent tenantId:", tenantId);

  const epinetStore = hourlyEpinetStore.get();
  const tenantData = epinetStore.data[tenantId] || {};

  // Get all epinets in the system
  const epinets = Object.keys(tenantData);
  if (VERBOSE) console.log("[DEBUG-TENANT] processEpinetEvent epinets:", epinets);

  if (epinets.length === 0) return;

  // Get content items for title resolution
  const $contentMap = contentMap.get();
  const contentItems = Array.isArray($contentMap)
    ? $contentMap.reduce(
        (acc, item) => {
          if (item.id) acc[item.id] = item;
          return acc;
        },
        {} as Record<string, any>
      )
    : {};

  // For each epinet, try to match the event against epinet steps
  for (const epinetId of epinets) {
    try {
      // Get the epinet definition asynchronously
      getAllEpinets(context)
        .then((allEpinets) => {
          const epinet = allEpinets.find((e) => e.id === epinetId);
          if (!epinet) return;

          // For each step in the epinet, check if this event matches
          for (const step of epinet.steps) {
            // Type assertion since we know the structure is correct
            const typedStep = step as
              | EpinetStepBelief
              | EpinetStepIdentifyAs
              | EpinetStepCommitmentAction
              | EpinetStepConversionAction;

            const isMatch = matchEventToStep(event, typedStep);

            if (isMatch) {
              // Find the user's previous step node in this epinet
              const previousNodeId = findUserPreviousNode(epinetId, fingerprintId, context);

              // Generate a node ID specific to this event/content
              const nodeId = getEventNodeId(event);

              // Generate a human-readable node name
              const nodeName = getContentNodeName(event, contentItems);

              // Record this step and transition
              updateEpinetHourlyData(
                fingerprintId,
                epinetId,
                nodeId,
                nodeName,
                previousNodeId,
                context
              );
            }
          }
        })
        .catch((err) => {
          console.error("Error processing event for epinet metrics:", err);
        });
    } catch (error) {
      console.error("Error in processEpinetEvent:", error);
    }
  }
}

/**
 * Generate a human-readable node name from an event
 */
function getContentNodeName(event: EventStream, contentItems: Record<string, any>): string {
  const content = contentItems[event.id];
  const contentTitle = content?.title || event.id.slice(0, 8);

  if (event.type === "Belief") {
    if (event.object !== undefined) {
      return `Identifies as: ${String(event.object)}`;
    } else {
      return `Believes: ${event.verb}`;
    }
  } else {
    // For action events
    switch (event.verb) {
      case "ENTERED":
        return `Entered: ${contentTitle}`;
      case "PAGEVIEWED":
        return `Viewed: ${contentTitle}`;
      case "READ":
        return `Read: ${contentTitle}`;
      case "GLOSSED":
        return `Skimmed: ${contentTitle}`;
      case "WATCHED":
        return `Watched: ${contentTitle}`;
      case "CLICKED":
        return `Clicked: ${contentTitle}`;
      case "SUBMITTED":
        return `Submitted: ${contentTitle}`;
      case "CONVERTED":
        return `Converted: ${contentTitle}`;
      default:
        return `${event.verb}: ${contentTitle}`;
    }
  }
}

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
 * Calculate transitions between consecutive steps only
 */
function calculateStepToStepTransitions(
  hourKey: string,
  epinetHourData: Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
): void {
  const hourData = epinetHourData[hourKey];

  // Create a map of visitors to the nodes they've visited, grouped by step index
  const visitorNodesByStep: Record<string, Record<number, string[]>> = {};

  // Populate visitor node data, organized by step
  for (const [nodeId, nodeData] of Object.entries(hourData.steps)) {
    nodeData.visitors.forEach((visitorId) => {
      if (!visitorNodesByStep[visitorId]) {
        visitorNodesByStep[visitorId] = {};
      }

      const stepIndex = nodeData.stepIndex;
      if (!visitorNodesByStep[visitorId][stepIndex]) {
        visitorNodesByStep[visitorId][stepIndex] = [];
      }

      visitorNodesByStep[visitorId][stepIndex].push(nodeId);
    });
  }

  // For each visitor, create transitions only between consecutive steps
  for (const visitorId in visitorNodesByStep) {
    const nodesByStep = visitorNodesByStep[visitorId];
    const stepIndices = Object.keys(nodesByStep)
      .map(Number)
      .sort((a, b) => a - b);

    // Skip if user only visited nodes in one step
    if (stepIndices.length < 2) continue;

    // For each consecutive pair of steps
    for (let i = 0; i < stepIndices.length - 1; i++) {
      const currentStepIndex = stepIndices[i];
      const nextStepIndex = stepIndices[i + 1];

      // Skip non-consecutive steps (important for proper step sequence)
      if (nextStepIndex !== currentStepIndex + 1) continue;

      const currentStepNodes = nodesByStep[currentStepIndex];
      const nextStepNodes = nodesByStep[nextStepIndex];

      // Create transitions from each node in current step to each node in next step
      for (const fromNodeId of currentStepNodes) {
        for (const toNodeId of nextStepNodes) {
          if (!hourData.transitions[fromNodeId]) {
            hourData.transitions[fromNodeId] = {};
          }

          if (!hourData.transitions[fromNodeId][toNodeId]) {
            hourData.transitions[fromNodeId][toNodeId] = {
              visitors: new Set(),
            };
          }

          hourData.transitions[fromNodeId][toNodeId].visitors.add(visitorId);
        }
      }
    }
  }
}

/**
 * Compute a Sankey diagram from epinet data for the specified time period
 * This function supports asynchronous processing and returns a loading status
 * if data isn't ready yet
 */
export async function computeEpinetSankey(
  epinetId: string,
  hours: number = 168,
  context?: APIContext
): Promise<ComputedEpinet | { status: string; message: string; id: string; title: string } | null> {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize computation state for this tenant if needed
  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      epinetLastComputed: {},
      pendingComputations: new Set(),
    };
  }

  // Check if data is being loaded
  const loadingStatus = getEpinetLoadingStatus(tenantId);
  const now = Date.now();

  // If we've computed this recently and it's still loading, return cached status
  const lastComputed = computationState[tenantId].epinetLastComputed[epinetId] || 0;
  if (loadingStatus.loading && now - lastComputed < COMPUTATION_THROTTLE_MS) {
    return {
      status: "loading",
      message: `Computing epinet data (${loadingStatus.progress.percentComplete}% complete)`,
      id: epinetId,
      title: "User Journey Flow (Loading...)",
    };
  }

  // Get data from store
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

  // If no data and not already loading, trigger background load
  if (
    !epinetData &&
    !loadingStatus.loading &&
    !computationState[tenantId].pendingComputations.has(epinetId)
  ) {
    computationState[tenantId].pendingComputations.add(epinetId);

    // Trigger loading in the background
    const loadingPromise = loadHourlyEpinetData(hours, false, context).catch((error) => {
      console.error(`Error loading epinet data for ${epinetId}:`, error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations.delete(epinetId);
    });

    return {
      status: "loading",
      message: "Starting epinet data computation...",
      id: epinetId,
      title: "User Journey Flow (Loading...)",
    };
  }

  // If loading is in progress, return status
  if (loadingStatus.loading) {
    return {
      status: "loading",
      message: `Computing epinet data (${loadingStatus.progress.percentComplete}% complete)`,
      id: epinetId,
      title: "User Journey Flow (Loading...)",
    };
  }

  // If data still not available after loading, return null
  if (!epinetData) {
    return null;
  }

  // Record computation time
  computationState[tenantId].epinetLastComputed[epinetId] = now;

  // Get the hour keys for the time period
  const hourKeys = getHourKeysForTimeRange(hours);

  // First, recalculate transitions for all hours using step-to-step approach
  for (const hourKey of hourKeys) {
    if (epinetData[hourKey]) {
      // Clear existing transitions
      epinetData[hourKey].transitions = {};
      // Calculate new step-to-step transitions
      calculateStepToStepTransitions(hourKey, epinetData);
    }
  }

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
    title: "User Journey Flow",
    nodes,
    links,
  };
}

/**
 * Compute epinet data for multiple time periods
 */
export async function computeAllEpinetRanges(
  epinetId: string,
  context?: APIContext
): Promise<{
  daily: ComputedEpinet | { status: string; message: string; id: string; title: string } | null;
  weekly: ComputedEpinet | { status: string; message: string; id: string; title: string } | null;
  monthly: ComputedEpinet | { status: string; message: string; id: string; title: string } | null;
}> {
  // Execute all computations in parallel for better performance
  const [daily, weekly, monthly] = await Promise.all([
    computeEpinetSankey(epinetId, 24, context),
    computeEpinetSankey(epinetId, 168, context),
    computeEpinetSankey(epinetId, 672, context),
  ]);

  return {
    daily,
    weekly,
    monthly,
  };
}

/**
 * Get epinet metrics for an epinet with support for asynchronous loading
 */
export async function getEpinetMetrics(
  id: string,
  duration: "daily" | "weekly" | "monthly" = "weekly",
  context?: APIContext
): Promise<ComputedEpinet | { status: string; message: string; id: string; title: string } | null> {
  const hours = duration === "daily" ? 24 : duration === "weekly" ? 168 : 672;
  return computeEpinetSankey(id, hours, context);
}

/**
 * Check if epinet computation is in progress
 */
export function isEpinetComputationPending(epinetId: string, context?: APIContext): boolean {
  const tenantId = context?.locals?.tenant?.id || "default";

  if (!computationState[tenantId]) {
    return false;
  }

  const loadingStatus = getEpinetLoadingStatus(tenantId);
  return loadingStatus.loading || computationState[tenantId].pendingComputations.has(epinetId);
}

/**
 * Force a refresh of epinet data
 */
export function triggerEpinetRefresh(epinetId: string, context?: APIContext): void {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize computation state for this tenant if needed
  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      epinetLastComputed: {},
      pendingComputations: new Set(),
    };
  }

  const loadingStatus = getEpinetLoadingStatus(tenantId);
  if (!loadingStatus.loading) {
    computationState[tenantId].pendingComputations.add(epinetId);

    // Create a non-blocking promise to load the data
    const loadingPromise = loadHourlyEpinetData(672, false, context).catch((error) => {
      console.error(`Error refreshing epinet data for ${epinetId}:`, error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations.delete(epinetId);
    });
  }
}
