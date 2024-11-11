import type { APIRoute } from "astro";
import { runLemurTask } from "../../../api/aai";

export const POST: APIRoute = async ({ request, params }) => {
  const { operation } = params;
  const body = await request.json();

  try {
    let result;
    switch (operation) {
      case "lemurTask":
        if (!body.prompt) {
          throw new Error("prompt is required for LeMUR task");
        }
        result = await runLemurTask(body);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in AssemblyAI ${operation} route:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : `Failed to execute ${operation}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
