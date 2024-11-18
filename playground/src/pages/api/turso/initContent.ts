import { createTursoClient, getCurrentMode, getWriteClient } from "../../../db/utils";
import { initializeContent } from "../../../db/schema";
import { TursoOperationError } from "../../../types";
import type { APIRoute } from "astro";

export const POST: APIRoute = async () => {
  try {
    await createTursoClient();
    const writeClient = getWriteClient();

    // Initialize schema on the appropriate database
    await initializeContent({
      client: writeClient,
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode: getCurrentMode(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Database initialization error:", error);
    const isOperationError = error instanceof TursoOperationError;

    return new Response(
      JSON.stringify({
        success: false,
        mode: getCurrentMode(),
        error: isOperationError ? error.message : "Failed to initialize database",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
