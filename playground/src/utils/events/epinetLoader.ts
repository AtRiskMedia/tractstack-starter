import { tursoClient } from "@/utils/db/client";
import {
  hourlyEpinetStore,
  formatHourKey,
  createEmptyHourlyEpinetData,
  getHourKeysForTimeRange,
} from "@/store/analytics";
import type {
  APIContext,
  EpinetStep,
  EpinetStepBelief,
  EpinetStepIdentifyAs,
  EpinetStepCommitmentAction,
  EpinetStepConversionAction,
} from "@/types";

export async function loadHourlyEpinetData(
  hours: number = 672,
  context?: APIContext
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const client = await tursoClient.getClient(context);
  if (!client) {
    return;
  }

  const { rows: epinetRows } = await client.execute(`
    SELECT id, title, options_payload FROM epinets
  `);

  if (epinetRows.length === 0) {
    return;
  }

  const epinets = epinetRows.map((row) => {
    let steps: EpinetStep[] = [];
    let promoted = false;

    try {
      if (row.options_payload) {
        const options = JSON.parse(String(row.options_payload));
        if (typeof options === "object") {
          if (Array.isArray(options.steps)) {
            steps = options.steps;
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

  const hourKeys = getHourKeysForTimeRange(hours);
  if (!hourKeys.length) {
    return;
  }

  const epinetData: Record<
    string,
    Record<string, ReturnType<typeof createEmptyHourlyEpinetData>>
  > = {};
  epinets.forEach((epinet) => {
    epinetData[epinet.id] = {};
    for (const hourKey of hourKeys) {
      epinetData[epinet.id][hourKey] = createEmptyHourlyEpinetData();
    }
  });

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

  for (const epinet of epinets) {
    const beliefSteps = epinet.steps.filter(
      (step): step is EpinetStepBelief | EpinetStepIdentifyAs =>
        step.gateType === "belief" || step.gateType === "identifyAs"
    );

    if (beliefSteps.length > 0) {
      for (const step of beliefSteps) {
        let query = "";
        const args = [startTime.toISOString(), endTime.toISOString()];

        if (step.gateType === "belief") {
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
          const { rows } = await client.execute({ sql: query, args });

          rows.forEach((row) => {
            const hourKey = String(row.hour_key);
            const fingerprintId = String(row.fingerprint_id);
            const stepId = getStableStepId(step);

            if (epinetData[epinet.id][hourKey]) {
              if (!epinetData[epinet.id][hourKey].steps[stepId]) {
                epinetData[epinet.id][hourKey].steps[stepId] = { visitors: new Set() };
              }
              epinetData[epinet.id][hourKey].steps[stepId].visitors.add(fingerprintId);
            }
          });
        }
      }
    }

    const actionSteps = epinet.steps.filter(
      (step): step is EpinetStepCommitmentAction | EpinetStepConversionAction =>
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

        if (step.objectType) {
          query += " AND object_type = ?";
          args.push(step.objectType);
        }

        if (step.objectIds && step.objectIds.length > 0) {
          query += ` AND object_id IN (${step.objectIds.map(() => "?").join(",")})`;
          args.push(...step.objectIds);
        }

        const { rows } = await client.execute({ sql: query, args });

        rows.forEach((row) => {
          const hourKey = String(row.hour_key);
          const fingerprintId = String(row.fingerprint_id);
          const stepId = getStableStepId(step);

          if (epinetData[epinet.id][hourKey]) {
            if (!epinetData[epinet.id][hourKey].steps[stepId]) {
              epinetData[epinet.id][hourKey].steps[stepId] = { visitors: new Set() };
            }
            epinetData[epinet.id][hourKey].steps[stepId].visitors.add(fingerprintId);
          }
        });
      }
    }
  }

  for (const epinet of epinets) {
    for (const hourKey of hourKeys) {
      const hourData = epinetData[epinet.id][hourKey];
      const stepIds = Object.keys(hourData.steps);

      if (stepIds.length < 2) continue;

      for (let i = 0; i < stepIds.length; i++) {
        const fromStepId = stepIds[i];
        const fromStepData = hourData.steps[fromStepId];

        for (let j = 0; j < stepIds.length; j++) {
          if (i === j) continue;

          const toStepId = stepIds[j];
          const toStepData = hourData.steps[toStepId];

          const transitUsers = new Set<string>();
          fromStepData.visitors.forEach((visitor: string) => {
            if (toStepData.visitors.has(visitor)) {
              transitUsers.add(visitor);
            }
          });

          if (transitUsers.size > 0) {
            if (!hourData.transitions[fromStepId]) {
              hourData.transitions[fromStepId] = {};
            }
            hourData.transitions[fromStepId][toStepId] = { visitors: transitUsers };
          }
        }
      }
    }
  }

  const currentStore = hourlyEpinetStore.get();
  if (!currentStore.data[tenantId]) {
    currentStore.data[tenantId] = {};
  }
  currentStore.data[tenantId] = epinetData;
  currentStore.lastFullHour[tenantId] = formatHourKey(new Date());
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
