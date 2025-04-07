import { getLeadMetrics as getLeadMetricsFromTurso } from "@/utils/db/turso";
import type { LeadMetrics } from "@/types";
import type { APIContext } from "@/types";

export async function getLeadMetrics(context?: APIContext): Promise<LeadMetrics> {
  try {
    const leadMetrics = await getLeadMetricsFromTurso(context);
    return leadMetrics;
  } catch (error) {
    console.error("Error in getLeadMetrics:", error);
    throw error;
  }
}
