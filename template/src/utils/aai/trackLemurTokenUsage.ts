import { logTokenUsage } from "@/utils/db/turso";
import type { APIContext } from "@/types";

export async function trackLemurTokenUsage(response: any, context: APIContext): Promise<void> {
  const tenantId = context.locals.tenant?.id || "default";

  if (response && response.usage) {
    try {
      const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
      // Pass context to logTokenUsage for tenant-specific DB operations
      await logTokenUsage(totalTokens, context);
    } catch (error) {
      console.error(`Error tracking LeMUR token usage for tenant ${tenantId}:`, error);
    }
  } else {
    console.warn(`No token usage information available in LeMUR response for tenant ${tenantId}`);
  }
}
