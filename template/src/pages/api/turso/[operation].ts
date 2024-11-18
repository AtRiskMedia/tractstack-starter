import type { APIRoute } from "astro";
import {
  getPaneDesigns,
  executeQueries,
  getUniqueTailwindClasses,
  checkTursoStatus,
  isContentPrimed,
} from "../../../api/turso";
import { createTursoClient, getWriteClient } from "../../../db/utils";
import { initializeSchema, initializeContent } from "../../../db/schema";

export const POST: APIRoute = async ({ request, params }) => {
  const { operation } = params;

  try {
    let result;
    switch (operation) {
      case "test": {
        await createTursoClient();
        result = JSON.stringify({ success: true });
        break;
      }

      case "status": {
        await createTursoClient();
        const writeClient = getWriteClient();
        await writeClient.execute("SELECT 1");
        const isReady = await checkTursoStatus();
        result = { success: true, isReady };
        break;
      }

      case "init": {
        await createTursoClient();
        const writeClient = getWriteClient();
        await initializeSchema({ client: writeClient });
        const isReady = await checkTursoStatus();
        result = { success: true, isReady };
        break;
      }

      case "contentPrimed": {
        const isContentPrimedResponse = await isContentPrimed();
        result = { success: true, isContentPrimed: isContentPrimedResponse };
        break;
      }

      case "initContent": {
        const isReady = await checkTursoStatus();
        if (!isReady) {
          throw new Error(
            "Database tables not initialized correctly. Please reinitialize database tables."
          );
        }
        const writeClient = getWriteClient();
        await initializeContent({ client: writeClient });
        result = { success: true };
        break;
      }

      case "paneDesigns":
        result = await getPaneDesigns();
        break;

      case "uniqueTailwindClasses": {
        const body = await request.json();
        result = await getUniqueTailwindClasses(body.id);
        break;
      }

      case "execute": {
        const execBody = await request.json();
        if (!Array.isArray(execBody.queries)) {
          throw new Error("Invalid or missing queries array");
        }
        result = await executeQueries(execBody.queries);
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in Turso ${operation} route:`, error);
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
