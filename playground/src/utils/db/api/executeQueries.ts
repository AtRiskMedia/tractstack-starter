import { tursoClient } from "../client";
import type { TursoQuery } from "../../../types";
import type { ResultSet } from "@libsql/client";

export async function executeQueries(
  queries: TursoQuery[]
): Promise<{ success: boolean; results: ResultSet[] }> {
  const results: ResultSet[] = [];

  try {
    const client = await tursoClient.getClient();
    if (!client) return { success: false, results: [] };

    for (const query of queries) {
      const result = await client.execute(query);
      results.push(result);
    }

    return { success: true, results };
  } catch (error) {
    console.error("Error executing queries:", error);
    throw error;
  }
}
