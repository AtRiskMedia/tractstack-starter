import { tursoClient } from "@/utils/db/client";
import {
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
  getHourKeysForTimeRange,
} from "@/store/analytics";
import { contentMap } from "@/store/events";
import type {
  APIContext,
  EpinetStep,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
} from "@/types";

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
  step:
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction,
  contentId: string,
  contentItems: Record<string, any>
): string {
  const content = contentItems[contentId];
  const contentTitle = content?.title || contentId.slice(0, 8);

  if (step.gateType === "belief") {
    // For belief gates
    return `Believes: ${step.title || step.values.join("/")}`;
  } else if (step.gateType === "identifyAs") {
    // For identifyAs gates
    return `Identifies as: ${step.title || step.values.join("/")}`;
  } else if (step.gateType === "commitmentAction") {
    // For commitment actions
    const actionVerb = step.values[0] || "";
    switch (actionVerb) {
      case "ENTERED":
        return `Entered: ${contentTitle}`;
      case "PAGEVIEWED":
        return `Viewed: ${contentTitle}`;
      case "CLICKED":
        return `Clicked: ${contentTitle}`;
      default:
        return `${actionVerb}: ${contentTitle}`;
    }
  } else if (step.gateType === "conversionAction") {
    // For conversion actions
    const actionVerb = step.values[0] || "";
    switch (actionVerb) {
      case "SUBMITTED":
        return `Submitted: ${contentTitle}`;
      case "CONVERTED":
        return `Converted: ${contentTitle}`;
      default:
        return `${actionVerb}: ${contentTitle}`;
    }
  }

  // Default case if none of the above matched (shouldn't happen with proper typing)
  return `${(step as any).title || contentTitle}`;
}

/**
 * Loads hourly epinet data for the specified time period
 */
export async function loadHourlyEpinetData(
  hours: number = 672,
  context?: APIContext
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const client = await tursoClient.getClient(context);
  if (!client) {
    return;
  }

  // Get all epinets to analyze their structure
  const { rows: epinetRows } = await client.execute(`
    SELECT id, title, options_payload FROM epinets
  `);

  if (epinetRows.length === 0) {
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

  // Get all content items for connecting IDs to titles
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

  // Set up time period for queries
  const hourKeys = getHourKeysForTimeRange(hours);
  if (!hourKeys.length) {
    return;
  }

  const firstHourParts = hourKeys[hours - 1].split("-").map(Number);
  const lastHourParts = hourKeys[0].split("-").map(Number);

  const startTime = new Date(
    firstHourParts[0],
    firstHourParts[1] - 1,
    firstHourParts[2],
    firstHourParts[3]
  );

  const endTime = new Date(
    lastHourParts[0],
    lastHourParts[1] - 1,
    lastHourParts[2],
    lastHourParts[3]
  );
  endTime.setHours(endTime.getHours() + 1);

  // Initialize epinet data structure
  const epinetData: Record<
    string,
    Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
  > = {};

  for (const epinet of epinets) {
    epinetData[epinet.id] = {};
    for (const hourKey of hourKeys) {
      epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
    }
  }

  // Process each epinet
  for (const epinet of epinets) {
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

    // Process belief steps if any exist
    if (beliefSteps.length > 0) {
      await processBeliefStepsForEpinet(
        beliefSteps,
        epinetData[epinet.id],
        startTime,
        endTime,
        hourKeys,
        client,
        contentItems
      );
    }

    // Process action steps if any exist
    if (actionSteps.length > 0) {
      await processActionStepsForEpinet(
        actionSteps,
        epinetData[epinet.id],
        startTime,
        endTime,
        hourKeys,
        client,
        contentItems
      );
    }

    // Calculate transitions for each hour based on chronological ordering
    for (const hourKey of hourKeys) {
      calculateChronologicalTransitions(hourKey, epinetData[epinet.id]);
    }
  }

  // Store the processed data
  const currentStore = hourlyEpinetStore.get();
  if (!currentStore.data[tenantId]) {
    currentStore.data[tenantId] = {};
  }
  currentStore.data[tenantId] = epinetData;
  currentStore.lastFullHour[tenantId] = formatHourKey(new Date());
  hourlyEpinetStore.set(currentStore);
}

/**
 * Calculate transitions between nodes based on chronological ordering of events
 */
function calculateChronologicalTransitions(
  hourKey: string,
  epinetHourData: Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
): void {
  const hourData = epinetHourData[hourKey];

  // We need additional data about event timing to properly order transitions
  // For now, we'll assume transitions are valid between any nodes with common visitors
  // But we'll only create one-way transitions, not bidirectional ones

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
  // This is a simplified approach - ideally we would use event timestamps
  for (const visitorId in visitorNodes) {
    const nodes = visitorNodes[visitorId];

    if (nodes.length >= 2) {
      // Create forward transitions only - e.g. 0->1, 1->2, etc.
      for (let i = 0; i < nodes.length - 1; i++) {
        const fromNodeId = nodes[i];
        const toNodeId = nodes[i + 1];

        // Skip self-transitions
        if (fromNodeId === toNodeId) continue;

        // Initialize transition data if needed
        if (!hourData.transitions[fromNodeId]) {
          hourData.transitions[fromNodeId] = {};
        }

        if (!hourData.transitions[fromNodeId][toNodeId]) {
          hourData.transitions[fromNodeId][toNodeId] = {
            visitors: new Set(),
          };
        }

        // Record this visitor's transition
        hourData.transitions[fromNodeId][toNodeId].visitors.add(visitorId);
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
  client: any,
  contentItems: Record<string, any>
): Promise<void> {
  // Collect all belief values and identifyAs values for the query
  let whereConditions: string[] = [];
  let queryParams: any[] = [startTime.toISOString(), endTime.toISOString()];

  // Build WHERE conditions
  for (const step of beliefSteps) {
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

  // Execute consolidated query for beliefs
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
    ORDER BY updated_at ASC
  `;

  const { rows } = await client.execute({
    sql: query,
    args: queryParams,
  });

  // Process query results
  for (const row of rows) {
    const hourKey = String(row.hour_key);
    if (!hourKeys.includes(hourKey)) continue;

    const beliefId = String(row.belief_id);
    const fingerprintId = String(row.fingerprint_id);
    const verb = String(row.verb);
    const object = row.object !== null ? String(row.object) : null;

    // Match this row against each belief step
    for (const step of beliefSteps) {
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
          };
        }

        // Record this visitor
        epinetHourData[hourKey].steps[nodeId].visitors.add(fingerprintId);
      }
    }
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
  client: any,
  contentItems: Record<string, any>
): Promise<void> {
  // Collect query conditions for all action steps
  let whereConditions: string[] = [];
  let queryParams: any[] = [startTime.toISOString(), endTime.toISOString()];

  // Build WHERE conditions for all types of actions
  for (const step of actionSteps) {
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

  // Execute consolidated query for actions
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
      created_at >= ? AND created_at < ?
      AND (${whereConditions.join(" OR ")})
    ORDER BY created_at ASC
  `;

  const { rows } = await client.execute({
    sql: query,
    args: queryParams,
  });

  // Process all actions to create content-specific nodes
  for (const row of rows) {
    const hourKey = String(row.hour_key);
    if (!hourKeys.includes(hourKey)) continue;

    const objectId = String(row.object_id);
    const objectType = String(row.object_type);
    const fingerprintId = String(row.fingerprint_id);
    const verb = String(row.verb);

    // Match this action against each action step
    for (const step of actionSteps) {
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
          };
        }

        // Record this visitor
        epinetHourData[hourKey].steps[nodeId].visitors.add(fingerprintId);
      }
    }
  }
}
