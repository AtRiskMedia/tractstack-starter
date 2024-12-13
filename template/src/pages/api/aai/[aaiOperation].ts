import type { APIRoute } from "astro";
import { runLemurTask } from "../../../utils/aai/askLemur";

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { aaiOperation } = params;
    const body = await request.json();

    let result;
    switch (aaiOperation) {
      case "askLemur":
        if (!body.prompt) {
          throw new Error("prompt is required for LeMUR task");
        }
        result = await runLemurTask(body);
        break;

      default:
        throw new Error(`Unknown operation: ${aaiOperation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in AssemblyAI ${params.aaiOperation} route:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
