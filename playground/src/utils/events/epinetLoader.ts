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
const LOADING_THROTTLE_MS = 60000;
const RECENT_CHUNK_SIZE = 48;
const HISTORICAL_CHUNK_SIZE = 168;

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

function isCommitmentActionStep(step: EpinetStep): step is EpinetStepCommitmentAction {
  return step.gateType === "commitmentAction";
}
function isConversionActionStep(step: EpinetStep): step is EpinetStepConversionAction {
  return step.gateType === "conversionAction";
}
function isActionStep(
  step: EpinetStep
): step is EpinetStepCommitmentAction | EpinetStepConversionAction {
  return isCommitmentActionStep(step) || isConversionActionStep(step);
}
function isBeliefStep(step: EpinetStep): step is EpinetStepBelief {
  return step.gateType === "belief";
}
function isIdentifyAsStep(step: EpinetStep): step is EpinetStepIdentifyAs {
  return step.gateType === "identifyAs";
}

export function getStepNodeId(
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction,
  contentId: string
): string {
  const parts: string[] = [step.gateType];
  if (step.gateType === "belief" || step.gateType === "identifyAs") {
    if (step.values?.length) parts.push(step.values[0]);
  } else if (step.gateType === "commitmentAction" || step.gateType === "conversionAction") {
    parts.push(String(step.objectType || ""));
    if (step.values?.length) parts.push(step.values[0]);
  }
  parts.push(contentId);
  return parts.join("-");
}

export function getEventNodeId(event: {
  type: string;
  verb: string;
  id: string;
  object?: string | boolean;
}): string {
  if (event.type === "Belief") {
    return event.object !== undefined
      ? `identifyAs-${event.object}-${event.id}`
      : `belief-${event.verb}-${event.id}`;
  } else {
    return `commitmentAction-${event.type}-${event.verb}-${event.id}`;
  }
}

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
  console.warn(`Unexpected gateType: ${step.gateType}`);
  return `${step.title || contentTitle}`;
}

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

export async function loadHourlyEpinetData(
  hours: number = 672,
  context?: APIContext,
  currentHourOnly: boolean = false
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
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
  const now = Date.now();
  if (loadingState[tenantId].loading) {
    if (VERBOSE) console.log(`Epinet loading already in progress for tenant: ${tenantId}`);
    return;
  }
  if (now - loadingState[tenantId].lastLoadAttempt < LOADING_THROTTLE_MS) {
    if (VERBOSE) console.log(`Epinet loading throttled for tenant: ${tenantId}`);
    return;
  }
  try {
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

    // Get all epinets and parse their structure up front
    const epinets = await getEpinets(client);
    if (epinets.length === 0) {
      loadingState[tenantId].loading = false;
      return;
    }

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
      const currentHourKey = formatHourKey(new Date(Date.now()));
      hourKeys = [currentHourKey];
      const hourParts = currentHourKey.split("-").map(Number);
      startTime = new Date(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]);
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    } else {
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
      epinetData = { ...currentStore.data[tenantId] };
    } else {
      epinetData = {};
    }

    // Pre-analyze all epinets to determine what data we need
    const epinetAnalysis = analyzeEpinets(epinets);

    // Split processing between recent and historical data
    if (currentHourOnly) {
      await processEpinetDataForTimeRange(
        hourKeys,
        epinets,
        epinetAnalysis,
        epinetData,
        client,
        startTime,
        endTime,
        contentItems
      );
    } else {
      // For full updates, split into recent and historical
      const recentHourKeys = hourKeys.slice(0, Math.min(RECENT_CHUNK_SIZE, hourKeys.length));
      const historicalHourKeys = hourKeys.slice(Math.min(RECENT_CHUNK_SIZE, hourKeys.length));

      // Process recent data first
      if (recentHourKeys.length > 0) {
        const recentStartTime = parseHourKeyToDate(recentHourKeys[recentHourKeys.length - 1]);
        const recentEndTime = parseHourKeyToDate(recentHourKeys[0]);
        recentEndTime.setHours(recentEndTime.getHours() + 1);

        await processEpinetDataForTimeRange(
          recentHourKeys,
          epinets,
          epinetAnalysis,
          epinetData,
          client,
          recentStartTime,
          recentEndTime,
          contentItems
        );
      }

      // Process historical data in larger chunks
      if (historicalHourKeys.length > 0) {
        for (let i = 0; i < historicalHourKeys.length; i += HISTORICAL_CHUNK_SIZE) {
          const chunkHourKeys = historicalHourKeys.slice(
            i,
            Math.min(i + HISTORICAL_CHUNK_SIZE, historicalHourKeys.length)
          );
          if (chunkHourKeys.length === 0) continue;

          const chunkStartTime = parseHourKeyToDate(chunkHourKeys[chunkHourKeys.length - 1]);
          const chunkEndTime = parseHourKeyToDate(chunkHourKeys[0]);
          chunkEndTime.setHours(chunkEndTime.getHours() + 1);

          await processEpinetDataForTimeRange(
            chunkHourKeys,
            epinets,
            epinetAnalysis,
            epinetData,
            client,
            chunkStartTime,
            chunkEndTime,
            contentItems
          );

          // Small delay to avoid blocking the event loop for too long
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    // Trim old hourly bins that are outside our time window
    if (!currentHourOnly) {
      const oldestAllowedDate = new Date(Date.now());
      oldestAllowedDate.setUTCHours(oldestAllowedDate.getUTCHours() - MAX_ANALYTICS_HOURS);
      trimOldData(epinetData, oldestAllowedDate);
    }

    // Final store update
    currentStore.data[tenantId] = epinetData;
    currentStore.lastFullHour[tenantId] = formatHourKey(new Date(Date.now()));
    currentStore.lastUpdateTime[tenantId] = Date.now();
    hourlyEpinetStore.set(currentStore);
  } catch (error) {
    console.error(`Error loading hourly epinet data for tenant ${tenantId}:`, error);
    loadingState[tenantId].error = error instanceof Error ? error : new Error(String(error));
  } finally {
    loadingState[tenantId].loading = false;
    loadingState[tenantId].progress.currentEpinetId = null;
  }
}

async function getEpinets(client: Client): Promise<
  Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>
> {
  const { rows: epinetRows } = await client.execute(`
    SELECT id, title, options_payload FROM epinets
  `);
  if (VERBOSE) console.log(`[DEBUG-EPINET] Polled ${epinetRows.length} rows from epinets table`);
  return epinetRows.map((row) => {
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
}

function analyzeEpinets(
  epinets: Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>
): {
  beliefValues: Set<string>;
  identifyAsValues: Set<string>;
  actionVerbs: Set<string>;
  actionTypes: Set<string>;
  objectIds: Set<string>;
} {
  const analysis = {
    beliefValues: new Set<string>(),
    identifyAsValues: new Set<string>(),
    actionVerbs: new Set<string>(),
    actionTypes: new Set<string>(),
    objectIds: new Set<string>(),
  };

  epinets.forEach((epinet) => {
    epinet.steps.forEach((step) => {
      if (isBeliefStep(step) && step.values) {
        step.values.forEach((val) => analysis.beliefValues.add(val));
      } else if (isIdentifyAsStep(step) && step.values) {
        step.values.forEach((val) => analysis.identifyAsValues.add(val));
      } else if (isActionStep(step) && step.values) {
        step.values.forEach((val) => analysis.actionVerbs.add(val));
        if (step.objectType) {
          analysis.actionTypes.add(step.objectType);
        }
        if (step.objectIds && Array.isArray(step.objectIds)) {
          step.objectIds.forEach((id: string) => analysis.objectIds.add(id));
        }
      }
    });
  });
  return analysis;
}

async function processEpinetDataForTimeRange(
  hourKeys: string[],
  epinets: Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>,
  epinetAnalysis: ReturnType<typeof analyzeEpinets>,
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>,
  client: Client,
  startTime: Date,
  endTime: Date,
  contentItems: Record<string, FullContentMap>
): Promise<void> {
  // Initialize empty data structure for all hours and epinets
  initializeEpinetDataStructure(hourKeys, epinets, epinetData);

  // Process all belief-related data in one consolidated query
  if (epinetAnalysis.beliefValues.size > 0 || epinetAnalysis.identifyAsValues.size > 0) {
    await processBeliefData(
      hourKeys,
      epinets,
      epinetData,
      client,
      startTime,
      endTime,
      contentItems,
      epinetAnalysis
    );
  }

  // Process all action-related data in one consolidated query
  if (epinetAnalysis.actionVerbs.size > 0) {
    await processActionData(
      hourKeys,
      epinets,
      epinetData,
      client,
      startTime,
      endTime,
      contentItems,
      epinetAnalysis
    );
  }

  // Calculate transitions for each epinet and hour
  for (const epinet of epinets) {
    // Update progress tracking
    if (loadingState["default"]) {
      loadingState["default"].progress.currentEpinetId = epinet.id;
    }

    for (const hourKey of hourKeys) {
      if (epinetData[epinet.id] && epinetData[epinet.id][hourKey]) {
        calculateChronologicalTransitions(hourKey, epinetData[epinet.id]);
      }
    }

    // Update progress after completing each epinet
    if (loadingState["default"]) {
      loadingState["default"].progress.completed++;
    }
  }
}

function initializeEpinetDataStructure(
  hourKeys: string[],
  epinets: Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>,
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>
): void {
  for (const epinet of epinets) {
    if (!epinetData[epinet.id]) {
      epinetData[epinet.id] = {};
    }
    for (const hourKey of hourKeys) {
      if (!epinetData[epinet.id][hourKey]) {
        epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
      }
    }
  }
}

async function processBeliefData(
  hourKeys: string[],
  epinets: Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>,
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>,
  client: Client,
  startTime: Date,
  endTime: Date,
  contentItems: Record<string, FullContentMap>,
  analysis: ReturnType<typeof analyzeEpinets>
): Promise<void> {
  // Prepare query parameters
  const verbValues = Array.from(analysis.beliefValues);
  const objectValues = Array.from(analysis.identifyAsValues);

  // Build the where clause for the query
  let whereConditions = [];
  let params = [startTime.toISOString(), endTime.toISOString()];

  if (verbValues.length > 0) {
    whereConditions.push(`verb IN (${verbValues.map(() => "?").join(",")})`);
    params.push(...verbValues);
  }

  if (objectValues.length > 0) {
    whereConditions.push(`object IN (${objectValues.map(() => "?").join(",")})`);
    params.push(...objectValues);
  }

  if (whereConditions.length === 0) return;

  // Execute a single efficient query for all beliefs
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
      updated_at >= ? AND updated_at < ?
      AND (${whereConditions.join(" OR ")})
  `;

  try {
    const { rows } = await client.execute({
      sql: query,
      args: params,
    });

    if (VERBOSE) console.log(`[DEBUG-EPINET] Polled ${rows.length} rows from heldbeliefs`);

    // Process all rows once and match against epinet steps
    for (const row of rows) {
      const hourKey = String(row.hour_key);
      if (!hourKeys.includes(hourKey)) continue;

      const beliefId = String(row.belief_id);
      const fingerprintId = String(row.fingerprint_id);
      const verb = String(row.verb);
      const object = row.object !== null ? String(row.object) : null;

      // Match this belief data against all epinets and their steps
      for (const epinet of epinets) {
        if (!epinetData[epinet.id][hourKey]) continue;

        for (const [index, step] of epinet.steps.entries()) {
          if (step.gateType === "belief" && step.values.includes(verb)) {
            addNodeVisitor(
              epinetData,
              epinet.id,
              hourKey,
              step,
              beliefId,
              fingerprintId,
              index,
              contentItems
            );
          } else if (step.gateType === "identifyAs" && object && step.values.includes(object)) {
            addNodeVisitor(
              epinetData,
              epinet.id,
              hourKey,
              step,
              beliefId,
              fingerprintId,
              index,
              contentItems
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing belief data:", error);
  }
}

async function processActionData(
  hourKeys: string[],
  epinets: Array<{
    id: string;
    title: string;
    steps: EpinetStep[];
    promoted: boolean;
  }>,
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>,
  client: Client,
  startTime: Date,
  endTime: Date,
  contentItems: Record<string, FullContentMap>,
  analysis: ReturnType<typeof analyzeEpinets>
): Promise<void> {
  // Prepare query parameters
  const verbValues = Array.from(analysis.actionVerbs);
  const objectTypes = Array.from(analysis.actionTypes);

  // Build the where clause for the query
  let whereClause = "created_at >= ? AND created_at < ?";
  let params = [startTime.toISOString(), endTime.toISOString()];

  if (verbValues.length > 0) {
    whereClause += ` AND verb IN (${verbValues.map(() => "?").join(",")})`;
    params.push(...verbValues);
  }

  if (objectTypes.length > 0) {
    whereClause += ` AND object_type IN (${objectTypes.map(() => "?").join(",")})`;
    params.push(...objectTypes);
  }

  // Execute a single efficient query for all actions
  const query = `
    SELECT 
      strftime('%Y-%m-%d-%H', created_at) as hour_key,
      object_id,
      object_type,
      fingerprint_id,
      verb
    FROM actions
    WHERE ${whereClause}
  `;

  try {
    const { rows } = await client.execute({
      sql: query,
      args: params,
    });

    if (VERBOSE) console.log(`[DEBUG-EPINET] Polled ${rows.length} rows from actions`);

    // Process all rows once and match against epinet steps
    for (const row of rows) {
      const hourKey = String(row.hour_key);
      if (!hourKeys.includes(hourKey)) continue;

      const objectId = String(row.object_id);
      const objectType = String(row.object_type);
      const fingerprintId = String(row.fingerprint_id);
      const verb = String(row.verb);

      // Match this action data against all epinets and their steps
      for (const epinet of epinets) {
        if (!epinetData[epinet.id][hourKey]) continue;

        for (const [index, step] of epinet.steps.entries()) {
          if (isActionStep(step) && step.values.includes(verb)) {
            if (!step.objectType || step.objectType === objectType) {
              // Check object ID constraint if specified
              if (step.objectIds && step.objectIds.length > 0) {
                if (!step.objectIds.includes(objectId)) continue;
              }

              addNodeVisitor(
                epinetData,
                epinet.id,
                hourKey,
                step,
                objectId,
                fingerprintId,
                index,
                contentItems
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing action data:", error);
  }
}

function addNodeVisitor(
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>,
  epinetId: string,
  hourKey: string,
  step: EpinetStep,
  contentId: string,
  fingerprintId: string,
  stepIndex: number,
  contentItems: Record<string, FullContentMap>
): void {
  // Create a unique node ID for this step/content combination
  const nodeId = getStepNodeId(
    step as
      | EpinetStepBelief
      | EpinetStepIdentifyAs
      | EpinetStepCommitmentAction
      | EpinetStepConversionAction,
    contentId
  );

  // Create a human-readable name for this node
  const nodeName = getNodeName(step, contentId, contentItems);

  // Initialize the node if needed
  if (!epinetData[epinetId][hourKey].steps[nodeId]) {
    epinetData[epinetId][hourKey].steps[nodeId] = {
      visitors: new Set(),
      name: nodeName,
      stepIndex: stepIndex + 1, // 1-based index
    };
  }

  // Record this visitor
  epinetData[epinetId][hourKey].steps[nodeId].visitors.add(fingerprintId);
}

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

function trimOldData(
  epinetData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>>,
  oldestAllowedDate: Date
): void {
  for (const epinetId of Object.keys(epinetData)) {
    if (epinetData[epinetId]) {
      const hourKeys = Object.keys(epinetData[epinetId]);
      hourKeys.forEach((hourKey) => {
        try {
          const hourDate = parseHourKeyToDate(hourKey);
          if (hourDate < oldestAllowedDate) {
            delete epinetData[epinetId][hourKey];
          }
        } catch (error) {
          console.error(`Error trimming epinet data hour key ${hourKey}:`, error);
        }
      });
    }
  }
}
