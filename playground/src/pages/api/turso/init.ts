import { createTursoClient } from "../../../db/utils";
import { initializeSchema } from "../../..//db/schema";
import { TursoOperationError } from "../../../types";
import type { APIRoute } from "astro";

export const POST: APIRoute = async () => {
  try {
    const client = createTursoClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    await initializeSchema({ client });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    const isOperationError = error instanceof TursoOperationError;

    return new Response(
      JSON.stringify({
        success: false,
        error: isOperationError ? error.message : "Failed to initialize database",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
