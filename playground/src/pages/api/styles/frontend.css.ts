import type { APIRoute } from "astro";
import { cssStore } from "@/store/css";

export const GET: APIRoute = async ({ request }) => {
  const store = cssStore.get();

  // Get requested version from URL if present
  const url = new URL(request.url);
  const requestedVersion = url.searchParams.get("v");

  // Set cache control headers
  const headers = new Headers({
    "Content-Type": "text/css",
    "Cache-Control": "public, max-age=31536000", // 1 year
  });

  // If version matches store version, serve frontend.css
  if (store.version && requestedVersion === store.version && store.content) {
    if (store.version) {
      headers.set("ETag", `"${store.version}"`);
    }
    return new Response(store.content, {
      status: 200,
      headers,
    });
  }

  // If no CSS content is available, return 404
  return new Response("Not Found", { status: 404 });
};
