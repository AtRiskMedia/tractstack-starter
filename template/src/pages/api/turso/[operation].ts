import type { APIRoute } from "astro";
import { getPaneDesigns, executeQueries, getUniqueTailwindClasses } from "../../../api/turso";

export const POST: APIRoute = async ({ request, params /*, locals */ }) => {
  //if (!(locals.user?.isAuthenticated || locals.user?.isOpenDemo)) {
  //  return new Response(JSON.stringify({ error: "Unauthorized" }), {
  //    status: 401,
  //    headers: { "Content-Type": "application/json" },
  //  });
  //}

  const { operation } = params;
  const body = await request.json();

  try {
    let result;
    switch (operation) {
      case "test":
        result = JSON.stringify({ success: true });
        break;

      case "paneDesigns":
        result = await getPaneDesigns();
        break;

      case "uniqueTailwindClasses":
        result = await getUniqueTailwindClasses(body.id);
        break;

      case "execute":
        if (!Array.isArray(body.queries)) {
          throw new Error("Invalid or missing queries array");
        }
        result = await executeQueries(body.queries);
        break;

      //case "getResourcesBySlug":
      //  if (!Array.isArray(body.slugs)) {
      //    throw new Error("Invalid or missing slugs array");
      //  }
      //  result = await turso.getResourcesBySlug(body.slugs);
      //  break;
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

//// React component example
//
//import { useState, useEffect } from 'react';
//import { tursoClient } from '../api/tursoClient';
//import type { DatumPayload } from '../types';
//
//function DatumPayloadComponent() {
//  const [datumPayload, setDatumPayload] = useState<DatumPayload | null>(null);
//  const [isLoading, setIsLoading] = useState(true);
//  const [error, setError] = useState<string | null>(null);
//
//  useEffect(() => {
//    async function fetchDatumPayload() {
//      try {
//        setIsLoading(true);
//        const payload = await tursoClient.getDatumPayload();
//        setDatumPayload(payload);
//        setError(null);
//      } catch (err) {
//        console.error('Error fetching datum payload:', err);
//        setError(err instanceof Error ? err.message : 'An unknown error occurred');
//        setDatumPayload(null);
//      } finally {
//        setIsLoading(false);
//      }
//    }
//
//    fetchDatumPayload();
//  }, []);
//
//  if (isLoading) {
//    return <div>Loading...</div>;
//  }
//
//  if (error) {
//    return <div>Error: {error}</div>;
//  }
//
//  if (!datumPayload) {
//    return <div>No data available</div>;
//  }
//
//  return (
//    <div>
//      <h2>Datum Payload</h2>
//      <pre>{JSON.stringify(datumPayload, null, 2)}</pre>
//    </div>
//  );
//}
//
//export default DatumPayloadComponent;
