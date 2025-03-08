import { trackLemurTokenUsage } from "./trackLemurTokenUsage";
import { AssemblyAI } from "assemblyai";
import type { APIContext } from "@/types";

export const VALID_FINAL_MODELS = [
  "assemblyai/mistral-7b",
  "anthropic/claude-3-opus",
  "anthropic/claude-3-haiku",
  "anthropic/claude-3-sonnet",
  "anthropic/claude-3-5-sonnet",
] as const;

export type FinalModel = (typeof VALID_FINAL_MODELS)[number];

interface LemurTaskParams {
  prompt: string;
  context?: string | Record<string, unknown>;
  final_model?: FinalModel;
  input_text?: string;
  max_output_size?: number;
  temperature?: number;
  transcript_ids?: string[];
}

const client = new AssemblyAI({
  apiKey: import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY,
});

export async function runLemurTask(params: LemurTaskParams, context: APIContext) {
  const tenantId = context.locals.tenant?.id || "default";
  if (!import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY) {
    console.error(`AssemblyAI API key not configured for tenant ${tenantId}`);
    return null;
  }

  try {
    const final_model = params.final_model || "anthropic/claude-3-sonnet";
    const result = await client.lemur.task({
      ...params,
      final_model,
    });
    // Pass context to trackLemurTokenUsage for tenant-specific logging
    await trackLemurTokenUsage(result, context);
    return result;
  } catch (error) {
    console.error(`Error in runLemurTask for tenant ${tenantId}:`, error);
    throw error;
  }
}
