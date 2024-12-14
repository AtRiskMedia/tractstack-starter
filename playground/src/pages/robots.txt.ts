import { getConfig } from "../utils/core/config";
import type { APIRoute } from "astro";

const config = await getConfig();
const robotsTxt = `
User-agent: *
Disallow: /concierge/
Allow: /

Sitemap: ${new URL("sitemap.xml", config?.init?.SITE_URL).href}
`.trim();

export const GET: APIRoute = () => {
  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
