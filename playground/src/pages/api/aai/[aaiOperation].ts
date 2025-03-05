import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { runLemurTask } from "@/utils/aai/askLemur";

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const { aaiOperation } = context.params;
    const body = await context.request.json();

    let result;
    switch (aaiOperation) {
      case "askLemur":
        if (!body.prompt) {
          throw new Error("prompt is required for LeMUR task");
        }
        result = await runLemurTask(body, context);
        break;
      default:
        throw new Error(`Unknown operation: ${aaiOperation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in AssemblyAI ${context.params.aaiOperation} route:`, error);
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
});
