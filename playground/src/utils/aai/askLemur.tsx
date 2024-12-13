interface LemurTaskParams {
  prompt: string;
  context?: string | Record<string, unknown>;
  finalModel?: string;
  inputText?: string;
  maxOutputSize?: number;
  temperature?: number;
  transcriptIds?: string[];
}

interface LemurResponse {
  response: string;
  usage: {
    model: string;
    tokens: number;
  };
}

export async function askLemur(
  params: LemurTaskParams,
): Promise<LemurResponse | null> {
  if (!import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY) {
    console.error("AssemblyAI API key not configured");
    return null;
  }

  try {
    const response = await fetch("https://api.assemblyai.com/lemur/v3/generate/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: String(import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY),
      },
      body: JSON.stringify({
        prompt: params.prompt,
        context: params.context,
        final_model: params.finalModel,
        input_text: params.inputText,
        max_output_size: params.maxOutputSize,
        temperature: params.temperature,
        transcript_ids: params.transcriptIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`AssemblyAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      response: data.response,
      usage: {
        model: data.model || "unknown",
        tokens: data.tokens || 0,
      },
    };
  } catch (error) {
    console.error("Error in askLemur:", error);
    throw error;
  }
}
