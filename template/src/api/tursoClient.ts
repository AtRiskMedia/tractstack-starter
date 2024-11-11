import { isTursoClientError, UnauthorizedError, TursoOperationError } from "../types";
import type { TursoQuery, TursoOperation, TursoClientError } from "../types";

const BASE_URL = `/api/turso`;

function logError(error: TursoClientError): void {
  console.error("Logged error:", error);
}

async function fetchTurso(
  operation: TursoOperation,
  data: unknown = {},
  retries = 3
): Promise<unknown> {
  try {
    const response = await fetch(`${BASE_URL}/${operation}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "same-origin",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedError("Unauthorized. Please log in.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      window.location.href = `/storykeep/login?redirect=${window.location.pathname}`;
      throw error;
    }

    if (error instanceof TypeError && retries > 0) {
      console.warn(`Network error, retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchTurso(operation, data, retries - 1);
    }

    if (error instanceof Error) {
      if (isTursoClientError(error)) {
        logError(error);
      }
      throw new TursoOperationError(`Failed to execute operation: ${operation}`, operation);
    }
  }
}

export const tursoClient = {
  test: async (): Promise<unknown> => {
    try {
      return await fetchTurso("test");
    } catch (error) {
      if (isTursoClientError(error)) {
        logError(error);
      }
      throw error;
    }
  },
  uniqueTailwindClasses: async (id: string): Promise<unknown> => {
    try {
      return await fetchTurso("uniqueTailwindClasses", { id });
    } catch (error) {
      if (isTursoClientError(error)) {
        logError(error);
      }
      throw error;
    }
  },
  paneDesigns: async (): Promise<unknown> => {
    try {
      return await fetchTurso("paneDesigns");
    } catch (error) {
      if (isTursoClientError(error)) {
        logError(error);
      }
      throw error;
    }
  },
  execute: async (queries: TursoQuery[]): Promise<unknown> => {
    try {
      return await fetchTurso("execute", { queries });
    } catch (error) {
      if (isTursoClientError(error)) {
        logError(error);
      }
      throw error;
    }
  },
};
