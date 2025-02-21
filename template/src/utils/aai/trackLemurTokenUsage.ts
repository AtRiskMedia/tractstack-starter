import { logTokenUsage } from "@/utils/db/turso";

/**
 * Tracks token usage from a LeMUR task response
 *
 * @param response The response from the LeMUR API containing usage information
 */
export async function trackLemurTokenUsage(response: any): Promise<void> {
  if (response && response.usage) {
    try {
      const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
      await logTokenUsage(totalTokens);
    } catch (error) {
      console.error("Error tracking LeMUR token usage:", error);
    }
  } else {
    console.warn("No token usage information available in LeMUR response");
  }
}
