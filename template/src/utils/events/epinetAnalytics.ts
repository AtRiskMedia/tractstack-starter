import {
  getHourKeysForTimeRange,
  hourlyAnalyticsStore,
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
} from "@/store/analytics";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { contentMap } from "@/store/events";
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
  EpinetCustomMetricsFilters,
  EpinetCustomMetricsResponse,
} from "@/types";

const VERBOSE = false;
const MAX_NODES = 16;

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
 * @param epinetId - The ID of the epinet to compute data for
 * @param hours - Number of hours to include in the time period (default: 168)
 * @param context - Optional API context
 * @param visitorType - Optional filter for visitor type: "all", "anonymous", or "known"
 * @param selectedUserId - Optional specific visitor ID to filter for
 * @param startHour - Optional start hour (hours ago from now)
 * @param endHour - Optional end hour (hours ago from now)
 */
export async function computeEpinetSankey(
  epinetId: string,
  hours: number = 168,
  context?: APIContext,
  visitorType?: "all" | "anonymous" | "known",
  selectedUserId?: string | null,
  startHour?: number | null,
  endHour?: number | null
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
    const loadingPromise = loadHourlyEpinetData(hours, context, false).catch((error) => {
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

  // Determine hour keys based on parameters
  let hourKeys: string[];
  if (startHour !== null && endHour !== null) {
    // Use specified time range
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setHours(currentDate.getHours() - (startHour ?? 0));
    const endDate = new Date(currentDate);
    endDate.setHours(currentDate.getHours() - (endHour ?? 168));

    // Ensure proper order (min to max)
    const minDate = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const maxDate = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    // Generate hour keys for the range
    hourKeys = [];
    let currentHour = new Date(minDate);
    while (currentHour <= maxDate) {
      hourKeys.push(formatHourKey(currentHour));
      currentHour.setHours(currentHour.getHours() + 1);
    }
  } else {
    // Use default hours-based range
    hourKeys = getHourKeysForTimeRange(hours);
  }

  // Create a set of filtered visitor IDs
  const filterVisitorIds = new Set<string>();

  // Apply visitor type and user ID filtering if specified
  if (selectedUserId) {
    // Single user filter
    filterVisitorIds.add(selectedUserId);
  } else if (visitorType && visitorType !== "all") {
    // Filter by visitor type (known or anonymous)
    const analyticStore = hourlyAnalyticsStore.get();
    const tenantAnalyticsData = analyticStore.data[tenantId];

    // Process each hour in the range
    for (const hourKey of hourKeys) {
      const hourData = epinetData[hourKey];
      if (!hourData) continue;

      // For each step, check if visitors meet the filter criteria
      for (const step of Object.values(hourData.steps)) {
        step.visitors.forEach((visitorId) => {
          let isKnown = false;

          // Check if visitor is known in analytics data
          if (tenantAnalyticsData) {
            const hourData = tenantAnalyticsData.siteData[hourKey];
            if (hourData) {
              isKnown = hourData.knownVisitors.has(visitorId);
            }
          }

          // Add to filter set based on visitor type
          if ((visitorType === "known" && isKnown) || (visitorType === "anonymous" && !isKnown)) {
            filterVisitorIds.add(visitorId);
          }
        });
      }
    }
  }

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

      // Add visitors to node counts, applying filters if specified
      data.visitors.forEach((visitor) => {
        // Apply filters if they exist
        if ((visitorType && visitorType !== "all") || selectedUserId) {
          // Only include visitors that pass the filter
          if (filterVisitorIds.has(visitor)) {
            nodeCounts[nodeId].add(visitor);
          }
        } else {
          // No filtering, include all visitors
          nodeCounts[nodeId].add(visitor);
        }
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

        // Apply filters to transitions if specified
        data.visitors.forEach((visitor) => {
          if ((visitorType && visitorType !== "all") || selectedUserId) {
            // Only include visitors that pass the filter
            if (filterVisitorIds.has(visitor)) {
              transitionCounts[fromNode][toNode].add(visitor);
            }
          } else {
            // No filtering, include all visitors
            transitionCounts[fromNode][toNode].add(visitor);
          }
        });
      });
    });
  });

  // Sort nodes by count to keep the most significant ones
  const sortedNodes = Object.entries(nodeCounts)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, MAX_NODES); // Limit to ? most active nodes for readability

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
    const loadingPromise = loadHourlyEpinetData(672, context, false).catch((error) => {
      console.error(`Error refreshing epinet data for ${epinetId}:`, error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations.delete(epinetId);
    });
  }
}

/**
 * Get filtered visitor IDs with events in the specified time frame
 * @param epinetId - The ID of the epinet
 * @param visitorType - Type of visitors to include: "all", "anonymous", or "known"
 * @param startHour - Number of hours back from now to start the time range (inclusive)
 * @param endHour - Number of hours back from now to end the time range (inclusive)
 * @param context - Optional API context for tenant information
 * @returns A sorted array of visitor IDs as strings
 */
export async function getFilteredVisitorIds(
  epinetId: string,
  visitorType: "all" | "anonymous" | "known" = "all",
  startHour: number | null = null,
  endHour: number | null = null,
  context?: APIContext
): Promise<string[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const epinetStore = hourlyEpinetStore.get();
  const tenantData = epinetStore.data[tenantId] || {};
  const epinetData = tenantData[epinetId];

  if (!epinetData) {
    return [];
  }

  // Determine hour keys based on startHour and endHour
  let hourKeys: string[];
  if (startHour !== null && endHour !== null) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(now.getHours() - startHour);
    const endDate = new Date(now);
    endDate.setHours(now.getHours() - endHour);

    // Ensure startDate <= endDate
    const minDate = new Date(Math.min(startDate.getTime(), endDate.getTime()));
    const maxDate = new Date(Math.max(startDate.getTime(), endDate.getTime()));

    // Generate hour keys
    hourKeys = [];
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      hourKeys.push(formatHourKey(currentDate));
      currentDate.setHours(currentDate.getHours() + 1);
    }
  } else {
    // Use all hours if no time range specified
    hourKeys = Object.keys(epinetData);
  }

  // Collect visitor IDs with counts and known status
  const visitorMap = new Map<string, { count: number; isKnown: boolean }>();

  // Process relevant hours
  for (const hourKey of hourKeys) {
    const hourData = epinetData[hourKey];
    if (!hourData) continue;

    // Collect visitors from steps
    for (const step of Object.values(hourData.steps)) {
      step.visitors.forEach((visitorId) => {
        // Check if visitor is known
        const analyticStore = hourlyAnalyticsStore.get();
        const tenantAnalyticsData = analyticStore.data[tenantId];

        let isKnown = false;
        if (tenantAnalyticsData) {
          const knownVisitorSets = Object.values(tenantAnalyticsData.siteData).map(
            (hourData) => hourData.knownVisitors
          );
          isKnown = knownVisitorSets.some((set) => set.has(visitorId));
        }

        // Update visitor map
        if (visitorMap.has(visitorId)) {
          const existing = visitorMap.get(visitorId)!;
          visitorMap.set(visitorId, {
            count: existing.count + 1,
            isKnown: existing.isKnown || isKnown,
          });
        } else {
          visitorMap.set(visitorId, { count: 1, isKnown });
        }
      });
    }
  }

  // Filter by visitorType and map to IDs
  const filteredVisitorIds: string[] = [];
  visitorMap.forEach((data, id) => {
    if (
      visitorType === "all" ||
      (visitorType === "known" && data.isKnown) ||
      (visitorType === "anonymous" && !data.isKnown)
    ) {
      filteredVisitorIds.push(id);
    }
  });

  // Sort by count (descending) and ID (alphabetically)
  return filteredVisitorIds.sort((a, b) => {
    const countA = visitorMap.get(a)!.count;
    const countB = visitorMap.get(b)!.count;
    return countB !== countA ? countB - countA : a.localeCompare(b);
  });
}

/**
 * Compute epinet metrics with custom filtering
 * @param id - The epinet ID
 * @param filters - Custom filters for visitor type, time range, and selected user
 * @param context - Optional API context
 * @returns Epinet metrics and filtered visitor IDs
 */
export async function getEpinetCustomMetrics(
  id: string,
  filters: EpinetCustomMetricsFilters,
  context?: APIContext
): Promise<EpinetCustomMetricsResponse> {
  // Get visitor IDs for UI
  const availableVisitorIds = await getFilteredVisitorIds(
    id,
    filters.visitorType,
    filters.startHour,
    filters.endHour,
    context
  );

  // Use enhanced computeEpinetSankey with filters
  const epinet = await computeEpinetSankey(
    id,
    filters.startHour || filters.endHour ? undefined : 168, // Don't use hours if startHour/endHour provided
    context,
    filters.visitorType,
    filters.selectedUserId,
    filters.startHour,
    filters.endHour
  );

  return {
    epinet,
    availableVisitorIds,
  };
}
