import { tursoClient } from "@/utils/db/client";
import {
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
  getHourKeysForTimeRange,
} from "@/store/analytics";
import type { APIContext, EpinetStep } from "@/types";

/**
 * Loads hourly epinet analytics data from belief and action records
 * @param hours Number of hours back from now to load (default: 672 hours/28 days)
 * @param context API context for database access
 */
export async function loadHourlyEpinetData(
  hours: number = 672,
  context?: APIContext
): Promise<void> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    return;
  }

  // Get all epinets to have their definitions
  const { rows: epinetRows } = await client.execute(`
    SELECT id, title, options_payload FROM epinets
  `);

  if (epinetRows.length === 0) {
    // No epinets to load data for
    return;
  }

  const epinets = epinetRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    steps: row.options_payload ? JSON.parse(String(row.options_payload)) : [],
  }));

  const hourKeys = getHourKeysForTimeRange(hours);
  if (!hourKeys.length) {
    return;
  }

  // Initialize hourlyEpinetStore data structure
  const epinetData: Record<string, Record<string, any>> = {};
  epinets.forEach((epinet) => {
    epinetData[epinet.id] = {};

    for (const hourKey of hourKeys) {
      epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
    }
  });

  // Parse the first and last hour to get date range
  // Create proper dates from hour keys
  const firstHourParts = hourKeys[hours - 1].split("-").map(Number);
  const lastHourParts = hourKeys[0].split("-").map(Number);

  const startTime = new Date(
    firstHourParts[0], // year
    firstHourParts[1] - 1, // month (0-indexed)
    firstHourParts[2], // day
    firstHourParts[3] // hour
  );

  const endTime = new Date(
    lastHourParts[0], // year
    lastHourParts[1] - 1, // month (0-indexed)
    lastHourParts[2], // day
    lastHourParts[3] // hour
  );

  // Add an hour to include the full last hour
  endTime.setHours(endTime.getHours() + 1);

  // For each epinet, process belief-related steps
  for (const epinet of epinets) {
    const beliefSteps = epinet.steps.filter(
      (step: EpinetStep) => step.gateType === "belief" || step.gateType === "identifyAs"
    );

    if (beliefSteps.length > 0) {
      // Load relevant belief data from heldbeliefs
      for (const step of beliefSteps) {
        let query = "";
        const args = [startTime.toISOString(), endTime.toISOString()];

        if (step.gateType === "belief") {
          // For belief steps, we look at the verb
          query = `
            SELECT 
              strftime('%Y-%m-%d-%H', updated_at) as hour_key,
              belief_id,
              fingerprint_id,
              verb
            FROM heldbeliefs
            JOIN beliefs ON heldbeliefs.belief_id = beliefs.id
            WHERE 
              updated_at >= ? AND updated_at < ?
              AND verb IN (${step.values.map(() => "?").join(",")})
          `;
          args.push(...step.values);
        } else if (step.gateType === "identifyAs") {
          // For identifyAs steps, we look at the object value
          query = `
            SELECT 
              strftime('%Y-%m-%d-%H', updated_at) as hour_key,
              belief_id,
              fingerprint_id,
              object
            FROM heldbeliefs
            JOIN beliefs ON heldbeliefs.belief_id = beliefs.id
            WHERE 
              updated_at >= ? AND updated_at < ?
              AND object IN (${step.values.map(() => "?").join(",")})
          `;
          args.push(...step.values);
        }

        if (query) {
          const { rows } = await client.execute({
            sql: query,
            args,
          });

          // Process and add to appropriate hours
          rows.forEach((row) => {
            const hourKey = String(row.hour_key);
            const fingerprintId = String(row.fingerprint_id);
            const stepId = getStableStepId(step);

            // If this hour exists in our data (within our time range)
            if (epinetData[epinet.id][hourKey]) {
              // Initialize step data if needed
              if (!epinetData[epinet.id][hourKey].steps[stepId]) {
                epinetData[epinet.id][hourKey].steps[stepId] = {
                  visitors: new Set(),
                };
              }

              // Add this visitor to the step
              epinetData[epinet.id][hourKey].steps[stepId].visitors.add(fingerprintId);
            }
          });
        }
      }
    }

    // Process action-related steps (commitment & conversion)
    const actionSteps = epinet.steps.filter(
      (step: EpinetStep) =>
        step.gateType === "commitmentAction" || step.gateType === "conversionAction"
    );

    if (actionSteps.length > 0) {
      for (const step of actionSteps) {
        const validVerbs =
          step.gateType === "commitmentAction"
            ? ["CLICKED", "ENTERED"]
            : ["SUBMITTED", "CONVERTED"];

        let query = `
          SELECT 
            strftime('%Y-%m-%d-%H', created_at) as hour_key,
            object_id,
            fingerprint_id,
            verb
          FROM actions
          WHERE 
            created_at >= ? AND created_at < ?
            AND verb IN (${validVerbs.map(() => "?").join(",")})
        `;

        const args = [startTime.toISOString(), endTime.toISOString(), ...validVerbs];

        // Add object type filter
        if (step.objectType) {
          query += " AND object_type = ?";
          args.push(step.objectType);
        }

        // Add specific object IDs filter if present
        if (step.objectIds && step.objectIds.length > 0) {
          query += ` AND object_id IN (${step.objectIds.map(() => "?").join(",")})`;
          args.push(...step.objectIds);
        }

        const { rows } = await client.execute({ sql: query, args });

        // Process and add to appropriate hours
        rows.forEach((row) => {
          const hourKey = String(row.hour_key);
          const fingerprintId = String(row.fingerprint_id);
          const stepId = getStableStepId(step);

          // If this hour exists in our data (within our time range)
          if (epinetData[epinet.id][hourKey]) {
            // Initialize step data if needed
            if (!epinetData[epinet.id][hourKey].steps[stepId]) {
              epinetData[epinet.id][hourKey].steps[stepId] = {
                visitors: new Set(),
              };
            }

            // Add this visitor to the step
            epinetData[epinet.id][hourKey].steps[stepId].visitors.add(fingerprintId);
          }
        });
      }
    }
  }

  // Now analyze transitions
  // We need to find users who appeared in multiple steps and record transitions
  for (const epinet of epinets) {
    for (const hourKey of hourKeys) {
      const hourData = epinetData[epinet.id][hourKey];
      const stepIds = Object.keys(hourData.steps);

      // We need at least 2 steps to have transitions
      if (stepIds.length < 2) continue;

      for (let i = 0; i < stepIds.length; i++) {
        const fromStepId = stepIds[i];
        const fromStepData = hourData.steps[fromStepId];

        for (let j = 0; j < stepIds.length; j++) {
          if (i === j) continue; // Skip same step

          const toStepId = stepIds[j];
          const toStepData = hourData.steps[toStepId];

          // Find users who are in both steps (indicating a transition)
          const transitUsers = new Set<string>();
          fromStepData.visitors.forEach((visitor: string) => {
            if (toStepData.visitors.has(visitor)) {
              transitUsers.add(visitor);
            }
          });

          // If we found transitions, record them
          if (transitUsers.size > 0) {
            if (!hourData.transitions[fromStepId]) {
              hourData.transitions[fromStepId] = {};
            }

            hourData.transitions[fromStepId][toStepId] = {
              visitors: transitUsers,
            };
          }
        }
      }
    }
  }

  // Update the epinet store
  const currentHour = formatHourKey(new Date());
  hourlyEpinetStore.set({
    data: epinetData,
    lastFullHour: currentHour,
  });
}

/**
 * Generate a stable ID for an epinet step based on its properties
 * (Same implementation as in epinetAnalytics.ts)
 */
function getStableStepId(step: any): string {
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
