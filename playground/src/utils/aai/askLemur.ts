import { AssemblyAI } from "assemblyai";

// Valid final model options as a const
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

export async function runLemurTask(params: LemurTaskParams) {
  if (!import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY) {
    console.error("AssemblyAI API key not configured");
    return null;
  }

  try {
    // Default to claude-3-sonnet if no model specified
    const final_model = params.final_model || "anthropic/claude-3-sonnet";

    const result = await client.lemur.task({
      ...params,
      final_model,
    });
    console.log(`askLemur`, result);
    return result;
  } catch (error) {
    console.error("Error in runLemurTask:", error);
    throw error;
  }
}
