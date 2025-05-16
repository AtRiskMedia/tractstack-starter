import { tursoClient } from "@/utils/db/client";
import {
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
  getHourKeysForTimeRange,
  releaseCacheLock,
  tryAcquireCacheLock,
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

const VERBOSE = true;
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

export async function loadHourlyEpinetData(context?: APIContext): Promise<void> {
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

  // Check if this is a cold start
  const storeSnapshot = hourlyEpinetStore.get();
  const isCacheCold =
    !storeSnapshot.data[tenantId] || Object.keys(storeSnapshot.data[tenantId] || {}).length === 0;

  // Determine hours to load and mode based on cache state
  let hours: number;
  let currentHourOnly: boolean;

  if (isCacheCold) {
    // Cold start - load full history
    hours = MAX_ANALYTICS_HOURS;
    currentHourOnly = false;
    if (VERBOSE) console.log(`[DEBUG-EPINET] Cold start detected, loading ${hours} hours`);
  } else {
    // Get the last processed hour
    const lastProcessedHourKey = storeSnapshot.lastFullHour[tenantId];

    // Calculate the current hour
    const currentDate = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    );
    const currentHourKey = formatHourKey(currentDate);

    if (!lastProcessedHourKey) {
      // No last processed hour - MUST pull full history
      hours = MAX_ANALYTICS_HOURS;
      currentHourOnly = false;
      if (VERBOSE)
        console.log(`[DEBUG-EPINET] No last hour recorded, loading full history of ${hours} hours`);
    } else if (lastProcessedHourKey !== currentHourKey) {
      // Last hour different from current hour - check for gap
      const lastProcessedDate = parseHourKeyToDate(lastProcessedHourKey);

      // Calculate hours difference
      const diffMs = currentDate.getTime() - lastProcessedDate.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

      if (diffHours > 1) {
        // Gap detected - load enough hours to fill the gap
        hours = diffHours;
        currentHourOnly = false;
        if (VERBOSE)
          console.log(
            `[DEBUG-EPINET] Gap detected! Loading ${hours} hours to fill gap from ${lastProcessedHourKey} to ${currentHourKey}`
          );
      } else {
        // No gap - just update current hour
        hours = 1;
        currentHourOnly = true;
        if (VERBOSE) console.log(`[DEBUG-EPINET] No gap detected, updating current hour only`);
      }
    } else {
      // Last hour is current hour - just refresh it
      hours = 1;
      currentHourOnly = true;
      if (VERBOSE) console.log(`[DEBUG-EPINET] Refreshing current hour data`);
    }
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

  // Generate current hour key for lock
  const currentHour = formatHourKey(
    new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    )
  );

  // Try to acquire lock AFTER throttling check
  if (!tryAcquireCacheLock("epinet", tenantId, currentHour)) {
    if (VERBOSE)
      console.log(
        `[LOCK] Skipping epinet refresh for ${tenantId} as another process is handling it`
      );
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
      const currentDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      );
      const currentHourKey = formatHourKey(currentDate);
      hourKeys = [currentHourKey];
      const hourParts = currentHourKey.split("-").map(Number);
      startTime = new Date(Date.UTC(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]));
      endTime = new Date(
        Date.UTC(
          startTime.getUTCFullYear(),
          startTime.getUTCMonth(),
          startTime.getUTCDate(),
          startTime.getUTCHours() + 1
        )
      );
    } else {
      hourKeys = getHourKeysForTimeRange(hours);
      if (!hourKeys.length) {
        loadingState[tenantId].loading = false;
        return;
      }

      const firstHourKey = hourKeys.length > 0 ? hourKeys[hourKeys.length - 1] : null;
      if (!firstHourKey) {
        console.log("[DEBUG-EPINET-ERROR] No hour keys available");
        // Handle the error case
        return;
      }
      const firstHourParts = firstHourKey.split("-").map(Number);
      const lastHourParts = hourKeys[0].split("-").map(Number);
      startTime = new Date(
        Date.UTC(firstHourParts[0], firstHourParts[1] - 1, firstHourParts[2], firstHourParts[3])
      );
      endTime = new Date(
        Date.UTC(lastHourParts[0], lastHourParts[1] - 1, lastHourParts[2], lastHourParts[3])
      );
      endTime.setUTCHours(endTime.getUTCHours() + 1);
      if (VERBOSE)
        console.log("[DEBUG-EPINET] Time range parameters:", {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
    }

    // Initialize or get the current epinet data structure
    const currentStore = hourlyEpinetStore.get();

    // Initialize the store data for this tenant if it doesn't exist
    if (!currentStore.data[tenantId]) {
      currentStore.data[tenantId] = {};
    }

    // Create a working copy that will only contain the data we're processing
    let epinetData: Record<
      string,
      Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
    > = {};

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
        recentEndTime.setUTCHours(recentEndTime.getUTCHours() + 1);

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
          chunkEndTime.setUTCHours(chunkEndTime.getUTCHours() + 1);

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
      const oldestAllowedDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      );
      oldestAllowedDate.setUTCHours(oldestAllowedDate.getUTCHours() - MAX_ANALYTICS_HOURS);

      // Trim old data from existing store
      for (const epinetId of Object.keys(currentStore.data[tenantId] || {})) {
        if (currentStore.data[tenantId][epinetId]) {
          const hourKeys = Object.keys(currentStore.data[tenantId][epinetId]);
          hourKeys.forEach((hourKey) => {
            try {
              const hourDate = parseHourKeyToDate(hourKey);
              if (hourDate < oldestAllowedDate) {
                delete currentStore.data[tenantId][epinetId][hourKey];
              }
            } catch (error) {
              console.error(`Error trimming epinet data hour key ${hourKey}:`, error);
            }
          });
        }
      }
    }

    // Update the store with processed data
    const currentDate = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    );

    // Selectively update each epinet's data for processed hours
    for (const epinetId in epinetData) {
      if (!currentStore.data[tenantId][epinetId]) {
        currentStore.data[tenantId][epinetId] = {};
      }

      for (const hourKey in epinetData[epinetId]) {
        currentStore.data[tenantId][epinetId][hourKey] = epinetData[epinetId][hourKey];
      }
    }

    // Update metadata
    currentStore.lastFullHour[tenantId] = formatHourKey(currentDate);
    currentStore.lastUpdateTime[tenantId] = Date.now();
    hourlyEpinetStore.set(currentStore);
  } catch (error) {
    console.error(`Error loading hourly epinet data for tenant ${tenantId}:`, error);
    loadingState[tenantId].error = error instanceof Error ? error : new Error(String(error));
  } finally {
    loadingState[tenantId].loading = false;
    loadingState[tenantId].progress.currentEpinetId = null;
    releaseCacheLock("epinet", tenantId, currentHour);
  }
  if (VERBOSE) {
    const epinetStore = hourlyEpinetStore.get();
    const epinetData = epinetStore.data[tenantId] || {};
    const epinetCount = Object.keys(epinetData).length;
    const hourCount = new Map();

    // Count hours for each epinet
    Object.entries(epinetData).forEach(([epinetId, hourData]) => {
      const hoursForEpinet = Object.keys(hourData).length;
      hourCount.set(epinetId, hoursForEpinet);
    });

    const totalHours = Array.from(hourCount.values()).reduce((sum, count) => sum + count, 0);
    const averageHours = epinetCount > 0 ? totalHours / epinetCount : 0;

    console.log(
      `[DEBUG-EPINET] After refresh: tenant ${tenantId} has ${epinetCount} epinets with ${totalHours} total hour bins (avg ${averageHours.toFixed(1)} per epinet)`
    );
    console.log(
      `[DEBUG-EPINET] Current hour: ${formatHourKey(new Date())}, Last full hour: ${epinetStore.lastFullHour[tenantId]}`
    );
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
    actionTypes: new Set<string>(), // Fix: Use `new Set<string>()`
    objectIds: new Set<string>(), // Fix: Use `new Set<string>()`
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
      strftime('%Y-%m-%d-%H', updated_at, 'utc') as hour_key,
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
      strftime('%Y-%m-%d-%H', created_at, 'utc') as hour_key,
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
