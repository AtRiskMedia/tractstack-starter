import { AssemblyAI } from "assemblyai";

interface LemurTaskParams {
  prompt: string;
  context?: string | Record<string, unknown>;
  final_model?: string;
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
    const result = await client.lemur.task({
      prompt: params.prompt,
      context: params.context,
      final_model: params.final_model,
      input_text: params.input_text,
      max_output_size: params.max_output_size,
      temperature: params.temperature,
      transcript_ids: params.transcript_ids,
    });
    return result;
  } catch (error) {
    console.error("Error in runLemurTask:", error);
    throw error;
  }
}
