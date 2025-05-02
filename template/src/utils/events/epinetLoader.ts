import { tursoClient } from "@/utils/db/client";
import {
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
  getHourKeysForTimeRange,
} from "@/store/analytics";
import { getFullContentMap } from "@/utils/db/turso";
import { parseHourKeyToDate } from "@/utils/common/helpers";
import type {
  APIContext,
  EpinetStep,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
  FullContentMap,
} from "@/types";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import type { Client } from "@libsql/client";

const VERBOSE = false;

// Track loading state per tenant
const loadingState: Record<
  string,
  {
    loading: boolean;
    lastLoadAttempt: number;
    error: Error | null;
    progress: {
      total: number;
      completed: number;
      currentEpinetId: string | null;
    };
  }
> = {};

const LOADING_THROTTLE_MS = 60000; // 1 minute
const CHUNK_SIZE = 24; // Process 24 hours at a time (1 day)

/**
 * Generates a stable, unique ID for an epinet step that includes content ID
 */
export function getStepNodeId(
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction,
  contentId: string
): string {
  const parts: string[] = [step.gateType];

  // Add step values
  if (step.gateType === "belief" || step.gateType === "identifyAs") {
    if (step.values?.length) {
      // Use first value as a representative for the node ID
      parts.push(step.values[0]);
    }
  } else if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
    // Add the object type and first value as identifiers
    parts.push(String(step.objectType || ""));
    if (step.values?.length) {
      parts.push(step.values[0]);
    }
  }

  // Always include the content ID for uniqueness
  parts.push(contentId);

  return parts.join("-");
}

/**
 * Generate a node ID for an event that matches the format from getStepNodeId
 */
export function getEventNodeId(event: {
  type: string;
  verb: string;
  id: string;
  object?: string | boolean;
}): string {
  if (event.type === "Belief") {
    // For belief events
    if (event.object !== undefined) {
      return `identifyAs-${event.object}-${event.id}`;
    } else {
      return `belief-${event.verb}-${event.id}`;
    }
  } else {
    // For action events
    return `commitmentAction-${event.type}-${event.verb}-${event.id}`;
  }
}

/**
 * Gets a human-readable name for a step node, incorporating content titles
 */
export function getNodeName(
  step: EpinetStep,
  contentId: string,
  contentItems: Record<string, FullContentMap>
): string {
  const content = contentItems[contentId];
  const contentTitle = content?.title || "Unknown Content";

  if (step.gateType === "belief") {
    return `Believes: ${step.title || step.values.join("/")}`;
  } else if (step.gateType === "identifyAs") {
    return `Identifies as: ${step.title || step.values.join("/")}`;
  } else if (["commitmentAction", "conversionAction"].includes(step.gateType)) {
    const actionVerb = step.values[0] || "";
    return `${actionVerb}: ${contentTitle}`;
  }
  // Default case for unexpected gateType
  console.warn(`Unexpected gateType: ${step.gateType}`);
  return `${step.title || contentTitle}`;
}

/**
 * Check the loading status for a tenant's epinet data
 */
export function getEpinetLoadingStatus(tenantId: string = "default"): {
  loading: boolean;
  lastAttempt: number;
  error: Error | null;
  progress: {
    total: number;
    completed: number;
    currentEpinetId: string | null;
    percentComplete: number;
  };
} {
  if (!loadingState[tenantId]) {
    return {
      loading: false,
      lastAttempt: 0,
      error: null,
      progress: {
        total: 0,
        completed: 0,
        currentEpinetId: null,
        percentComplete: 0,
      },
    };
  }

  const state = loadingState[tenantId];
  return {
    loading: state.loading,
    lastAttempt: state.lastLoadAttempt,
    error: state.error,
    progress: {
      ...state.progress,
      percentComplete:
        state.progress.total > 0
          ? Math.round((state.progress.completed / state.progress.total) * 100)
          : 0,
    },
  };
}

/**
 * Loads hourly epinet data for the specified time period
 * @param hours Number of hours to load data for
 * @param currentHourOnly When true, only refresh the current hour's data
 * @param context API context for tenant information
 */
export async function loadHourlyEpinetData(
  hours: number = 672,
  currentHourOnly: boolean = false,
  context?: APIContext
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize loading state for this tenant if needed
  if (!loadingState[tenantId]) {
    loadingState[tenantId] = {
      loading: false,
      lastLoadAttempt: 0,
      error: null,
      progress: {
        total: 0,
        completed: 0,
        currentEpinetId: null,
      },
    };
  }

  // Check if already loading or throttled
  const now = Date.now();
  if (loadingState[tenantId].loading) {
    if (VERBOSE) console.log(`Epinet loading already in progress for tenant: ${tenantId}`);
    return;
  }

  // Don't retry loading too frequently if there was a recent attempt
  if (now - loadingState[tenantId].lastLoadAttempt < LOADING_THROTTLE_MS) {
    if (VERBOSE) console.log(`Epinet loading throttled for tenant: ${tenantId}`);
    return;
  }

  try {
    // Set loading state
    loadingState[tenantId].loading = true;
    loadingState[tenantId].lastLoadAttempt = now;
    loadingState[tenantId].error = null;
    loadingState[tenantId].progress = {
      total: 0,
      completed: 0,
      currentEpinetId: null,
    };

    if (VERBOSE)
      console.log(
        `[DEBUG-EPINET] loading data from turso for ${tenantId}, hours:${hours} ${currentHourOnly ? `CURRENT HOUR ONLY` : ``}`
      );

    const client = await tursoClient.getClient(context);
    if (!client) {
      throw new Error(`Failed to get database client for tenant ${tenantId}`);
    }

    // Get all epinets to analyze their structure
    const { rows: epinetRows } = await client.execute(`
      SELECT id, title, options_payload FROM epinets
    `);
    if (VERBOSE)
      console.log(
        `[DEBUG-EPINET] Polled ${epinetRows.length} rows from epinets table for tenant ${tenantId}`
      );

    if (epinetRows.length === 0) {
      // No epinets to process
      loadingState[tenantId].loading = false;
      return;
    }

    // Parse all epinets up front
    const epinets = epinetRows.map((row) => {
      let steps: EpinetStep[] = [];
      let promoted = false;

      try {
        if (row.options_payload) {
          const options = JSON.parse(String(row.options_payload));
          if (Array.isArray(options)) {
            steps = options as EpinetStep[];
          } else if (typeof options === "object") {
            if (Array.isArray(options.steps)) {
              steps = options.steps as EpinetStep[];
            }
            promoted = !!options.promoted;
          }
        }
      } catch (parseError) {
        console.error(`Error parsing options_payload for epinet ${row.id}:`, parseError);
      }

      return {
        id: String(row.id),
        title: String(row.title),
        steps,
        promoted,
      };
    });

    // Update progress info
    loadingState[tenantId].progress.total = epinets.length;

    // Get all content items for connecting IDs to titles
    const contentMap = await getFullContentMap(context);
    const contentItems = contentMap.reduce(
      (acc, item) => {
        if (item.id) acc[item.id] = item;
        return acc;
      },
      {} as Record<string, FullContentMap>
    );

    // Set up time period for queries
    let hourKeys: string[];
    let startTime: Date, endTime: Date;

    if (currentHourOnly) {
      // For partial updates, only get the current hour
      const currentHourKey = formatHourKey(new Date());
      hourKeys = [currentHourKey];

      const hourParts = currentHourKey.split("-").map(Number);
      startTime = new Date(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]);
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    } else {
      // For full updates, get all hours in the specified range
      hourKeys = getHourKeysForTimeRange(hours);
      if (!hourKeys.length) {
        loadingState[tenantId].loading = false;
        return;
      }

      const firstHourParts = hourKeys[hours - 1].split("-").map(Number);
      const lastHourParts = hourKeys[0].split("-").map(Number);

      startTime = new Date(
        firstHourParts[0],
        firstHourParts[1] - 1,
        firstHourParts[2],
        firstHourParts[3]
      );

      endTime = new Date(
        lastHourParts[0],
        lastHourParts[1] - 1,
        lastHourParts[2],
        lastHourParts[3]
      );
      endTime.setHours(endTime.getHours() + 1);

      if (VERBOSE)
        console.log("[DEBUG-EPINET] Time range parameters:", {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
    }

    // Initialize or get the current epinet data structure
    const currentStore = hourlyEpinetStore.get();
    let epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>;

    if (currentHourOnly && currentStore.data[tenantId]) {
      // For partial updates, keep the existing data and only update the current hour
      epinetData = { ...currentStore.data[tenantId] };
    } else {
      // For full updates, initialize all hours in the range
      epinetData = {};
    }

    // Initialize any missing epinets or hours
    for (const epinet of epinets) {
      if (!epinetData[epinet.id]) {
        epinetData[epinet.id] = {};
      }

      for (const hourKey of hourKeys) {
        if (!epinetData[epinet.id][hourKey]) {
          epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
        } else if (currentHourOnly) {
          // For partial updates, reset the current hour's data to start fresh
          epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
        }
      }
    }

    // Process each epinet
    for (let epinetIndex = 0; epinetIndex < epinets.length; epinetIndex++) {
      const epinet = epinets[epinetIndex];

      // Update progress tracking
      loadingState[tenantId].progress.currentEpinetId = epinet.id;

      // Group steps by type for efficient querying
      const beliefSteps: (EpinetStepBelief | EpinetStepIdentifyAs)[] = [];
      const actionSteps: (EpinetStepCommitmentAction | EpinetStepConversionAction)[] = [];

      epinet.steps.forEach((step) => {
        if (step.gateType === "belief" || step.gateType === "identifyAs") {
          beliefSteps.push(step as EpinetStepBelief | EpinetStepIdentifyAs);
        } else if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
          actionSteps.push(step as EpinetStepCommitmentAction | EpinetStepConversionAction);
        }
      });

      // Process data in chunks to avoid long-running queries
      const processEpinetHoursChunk = async (startHourIndex: number, chunkSize: number) => {
        const endHourIndex = Math.min(startHourIndex + chunkSize, hourKeys.length);
        const chunkHourKeys = hourKeys.slice(startHourIndex, endHourIndex);

        if (chunkHourKeys.length === 0) return;

        const chunkStartTime = parseHourKeyToDate(chunkHourKeys[chunkHourKeys.length - 1]);
        const chunkEndTime = parseHourKeyToDate(chunkHourKeys[0]);
        chunkEndTime.setHours(chunkEndTime.getHours() + 1);

        // Process belief steps if any exist
        if (beliefSteps.length > 0) {
          await processBeliefStepsForEpinet(
            beliefSteps,
            epinetData[epinet.id],
            chunkStartTime,
            chunkEndTime,
            chunkHourKeys,
            client,
            contentItems
          );
        }

        // Process action steps if any exist
        if (actionSteps.length > 0) {
          await processActionStepsForEpinet(
            actionSteps,
            epinetData[epinet.id],
            chunkStartTime,
            chunkEndTime,
            chunkHourKeys,
            client,
            contentItems
          );
        }

        // Calculate transitions for each hour based on step ordering
        for (const hourKey of chunkHourKeys) {
          calculateChronologicalTransitions(hourKey, epinetData[epinet.id]);
        }

        // Update the store incrementally after each chunk
        // This allows partial data to be available while processing continues
        currentStore.data[tenantId] = epinetData;
        currentStore.lastFullHour[tenantId] = formatHourKey(new Date());
        currentStore.lastUpdateTime[tenantId] = Date.now();
        hourlyEpinetStore.set(currentStore);

        // Small delay to avoid blocking the event loop for too long
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      // Process hours in chunks
      for (let i = 0; i < hourKeys.length; i += CHUNK_SIZE) {
        await processEpinetHoursChunk(i, CHUNK_SIZE);
      }

      // Update progress after completing each epinet
      loadingState[tenantId].progress.completed++;
    }

    // Trim old hourly bins that are outside our time window
    if (!currentHourOnly) {
      const oldestAllowedDate = new Date();
      oldestAllowedDate.setHours(oldestAllowedDate.getHours() - MAX_ANALYTICS_HOURS);

      // For each epinet, remove hour keys that are older than our window
      for (const epinet of epinets) {
        if (epinetData[epinet.id]) {
          const hourKeys = Object.keys(epinetData[epinet.id]);
          hourKeys.forEach((hourKey) => {
            try {
              const hourDate = parseHourKeyToDate(hourKey);
              if (hourDate < oldestAllowedDate) {
                delete epinetData[epinet.id][hourKey];
              }
            } catch (error) {
              console.error(`Error trimming epinet data hour key ${hourKey}:`, error);
            }
          });
        }
      }
    }

    // Final store update
    currentStore.data[tenantId] = epinetData;
    currentStore.lastFullHour[tenantId] = formatHourKey(new Date());
    currentStore.lastUpdateTime[tenantId] = Date.now();
    hourlyEpinetStore.set(currentStore);
  } catch (error) {
    console.error(`Error loading hourly epinet data for tenant ${tenantId}:`, error);
    loadingState[tenantId].error = error instanceof Error ? error : new Error(String(error));
  } finally {
    // Clear loading state
    loadingState[tenantId].loading = false;
    loadingState[tenantId].progress.currentEpinetId = null;
  }
}

/**
 * Calculate transitions between nodes based on step ordering
 */
function calculateChronologicalTransitions(
  hourKey: string,
  epinetHourData: Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
): void {
  const hourData = epinetHourData[hourKey];

  // Create a map of visitors to the nodes they've visited
  const visitorNodes: Record<string, string[]> = {};

  // Populate visitor node data
  for (const [nodeId, nodeData] of Object.entries(hourData.steps)) {
    nodeData.visitors.forEach((visitorId) => {
      if (!visitorNodes[visitorId]) {
        visitorNodes[visitorId] = [];
      }
      visitorNodes[visitorId].push(nodeId);
    });
  }

  // For each visitor, create transitions between their nodes
  for (const visitorId in visitorNodes) {
    const nodes = visitorNodes[visitorId];

    if (nodes.length < 2) continue;

    // Sort nodes by stepIndex, then nodeId for same-step transitions
    const sortedNodes = nodes.sort((a, b) => {
      const aStep = hourData.steps[a].stepIndex;
      const bStep = hourData.steps[b].stepIndex;
      if (aStep !== bStep) {
        return aStep - bStep;
      }
      return a.localeCompare(b); // Alphabetical by nodeId for same step
    });

    // Create transitions for all valid pairs
    for (let i = 0; i < sortedNodes.length; i++) {
      for (let j = i + 1; j < sortedNodes.length; j++) {
        const fromNodeId = sortedNodes[i];
        const toNodeId = sortedNodes[j];

        // Skip self-transitions
        if (fromNodeId === toNodeId) continue;

        const fromStepIndex = hourData.steps[fromNodeId].stepIndex;
        const toStepIndex = hourData.steps[toNodeId].stepIndex;

        // Only create transitions where fromStepIndex <= toStepIndex
        if (fromStepIndex <= toStepIndex) {
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
 * Process belief steps with consolidated queries
 */
async function processBeliefStepsForEpinet(
  beliefSteps: (EpinetStepBelief | EpinetStepIdentifyAs)[],
  epinetHourData: Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>,
  startTime: Date,
  endTime: Date,
  hourKeys: string[],
  client: Client,
  contentItems: Record<string, FullContentMap>
): Promise<void> {
  // Collect all belief values and identifyAs values for the query
  let whereConditions: string[] = [];
  let queryParams: any[] = [startTime.toISOString(), endTime.toISOString()];

  // Build WHERE conditions
  for (const [_, step] of beliefSteps.entries()) {
    if (step.gateType === "belief" && step.values && step.values.length > 0) {
      const verbPlaceholders = step.values.map(() => "?").join(",");
      whereConditions.push(`(verb IN (${verbPlaceholders}))`);
      queryParams.push(...step.values);
    } else if (step.gateType === "identifyAs" && step.values && step.values.length > 0) {
      const objectPlaceholders = step.values.map(() => "?").join(",");
      whereConditions.push(`(object IN (${objectPlaceholders}))`);
      queryParams.push(...step.values);
    }
  }

  if (whereConditions.length === 0) return;

  const query = `
  SELECT 
    strftime('%Y-%m-%d-%H', updated_at) as hour_key,
    belief_id,
    fingerprint_id,
    verb,
    object
  FROM heldbeliefs
  JOIN beliefs ON heldbeliefs.belief_id = beliefs.id
  WHERE 
    (updated_at >= ? AND updated_at < ?)
    AND (${whereConditions.join(" OR ")})
  ORDER BY updated_at ASC
`;

  try {
    const { rows } = await client.execute({
      sql: query,
      args: [startTime.toISOString(), endTime.toISOString(), ...queryParams.slice(2)],
    });

    if (VERBOSE) console.log(`[DEBUG-EPINET] Polled ${rows.length} rows from heldbeliefs`);

    // Process query results
    for (const row of rows) {
      const hourKey = String(row.hour_key);
      if (!hourKeys.includes(hourKey)) continue;

      const beliefId = String(row.belief_id);
      const fingerprintId = String(row.fingerprint_id);
      const verb = String(row.verb);
      const object = row.object !== null ? String(row.object) : null;

      // Match this row against each belief step
      for (const [index, step] of beliefSteps.entries()) {
        let isMatch = false;

        if (step.gateType === "belief" && step.values.includes(verb)) {
          isMatch = true;
        } else if (step.gateType === "identifyAs" && object && step.values.includes(object)) {
          isMatch = true;
        }

        if (isMatch) {
          // Create a unique node ID for this belief/content combination
          const nodeId = getStepNodeId(step, beliefId);

          // Create a human-readable name for this node
          const nodeName = getNodeName(step, beliefId, contentItems);

          // Initialize the node if needed
          if (!epinetHourData[hourKey].steps[nodeId]) {
            epinetHourData[hourKey].steps[nodeId] = {
              visitors: new Set(),
              name: nodeName,
              stepIndex: index + 1, // 1-based index
            };
          }

          // Record this visitor
          epinetHourData[hourKey].steps[nodeId].visitors.add(fingerprintId);
        }
      }
    }
  } catch (error) {
    console.error("Error processing belief steps for epinet:", error);
    // Continue with other processing even if this part fails
  }
}

/**
 * Process action steps with consolidated queries
 */
async function processActionStepsForEpinet(
  actionSteps: (EpinetStepCommitmentAction | EpinetStepConversionAction)[],
  epinetHourData: Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>,
  startTime: Date,
  endTime: Date,
  hourKeys: string[],
  client: Client,
  contentItems: Record<string, FullContentMap>
): Promise<void> {
  // Collect query conditions for all action steps
  let whereConditions: string[] = [];
  let queryParams: any[] = [startTime.toISOString(), endTime.toISOString()];

  // Build WHERE conditions for all types of actions
  for (const [_, step] of actionSteps.entries()) {
    const verbValues = step.values || [];
    if (verbValues.length === 0) continue;

    let condition = `(verb IN (${verbValues.map(() => "?").join(",")})`;
    queryParams.push(...verbValues);

    if (step.objectType) {
      condition += ` AND object_type = ?`;
      queryParams.push(step.objectType);
    }

    if (step.objectIds && step.objectIds.length > 0) {
      condition += ` AND object_id IN (${step.objectIds.map(() => "?").join(",")})`;
      queryParams.push(...step.objectIds);
    }

    condition += ")";
    whereConditions.push(condition);
  }

  if (whereConditions.length === 0) return;

  const query = `
  SELECT 
    strftime('%Y-%m-%d-%H', created_at) as hour_key,
    object_id,
    object_type,
    fingerprint_id,
    verb,
    created_at
  FROM actions
  WHERE 
    (created_at >= ? AND created_at < ?)
    AND (${whereConditions.join(" OR ")})
  ORDER BY created_at ASC
`;

  try {
    const { rows } = await client.execute({
      sql: query,
      args: [startTime.toISOString(), endTime.toISOString(), ...queryParams.slice(2)],
    });

    if (VERBOSE) console.log(`[DEBUG-EPINET] Polled ${rows.length} rows from actions`);

    // Process all actions to create content-specific nodes
    for (const row of rows) {
      const hourKey = String(row.hour_key);
      if (!hourKeys.includes(hourKey)) continue;

      const objectId = String(row.object_id);
      const objectType = String(row.object_type);
      const fingerprintId = String(row.fingerprint_id);
      const verb = String(row.verb);

      // Match this action against each action step
      for (const [index, step] of actionSteps.entries()) {
        let isMatch = false;

        // Match by verb and object type
        if (step.values.includes(verb) && (!step.objectType || step.objectType === objectType)) {
          // Further filter by specific object IDs if specified
          if (step.objectIds && step.objectIds.length > 0) {
            isMatch = step.objectIds.includes(objectId);
          } else {
            isMatch = true;
          }
        }

        if (isMatch) {
          // Create a unique node ID for this action/content combination
          const nodeId = getStepNodeId(step, objectId);

          // Create a human-readable name for this node
          const nodeName = getNodeName(step, objectId, contentItems);

          // Initialize the node if needed
          if (!epinetHourData[hourKey].steps[nodeId]) {
            epinetHourData[hourKey].steps[nodeId] = {
              visitors: new Set(),
              name: nodeName,
              stepIndex: index + 1, // 1-based index
            };
          }

          // Record this visitor
          epinetHourData[hourKey].steps[nodeId].visitors.add(fingerprintId);
        }
      }
    }
  } catch (error) {
    console.error("Error processing action steps for epinet:", error);
    // Continue with other processing even if this part fails
  }
}
