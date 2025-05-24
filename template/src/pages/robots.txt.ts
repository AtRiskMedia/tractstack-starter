import { getConfigFromRequest } from "@/utils/core/contextConfig";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const config = await getConfigFromRequest(request);

  const robotsTxt = `
User-agent: *
Disallow: /concierge/
Disallow: /storykeep/
Disallow: /storykeep/*
Allow: /

Sitemap: ${new URL("sitemap.xml", config?.init?.SITE_URL).href}
`.trim();

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
