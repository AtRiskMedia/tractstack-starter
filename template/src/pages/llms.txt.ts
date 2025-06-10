import { getSiteMap } from "@/utils/db/turso";
import { getConfigFromRequest } from "@/utils/core/contextConfig";
import { withTenantContext } from "@/utils/api/middleware";
import type { APIRoute } from "astro";
import type { APIContext, SiteMap } from "@/types";

export const ALL: APIRoute = withTenantContext(async (context: APIContext) => {
  const config = await getConfigFromRequest(context.request);

  const contentMap: SiteMap[] = await getSiteMap(context);

  // Filter for public content (StoryFragments and context Panes)
  const publicContent = contentMap.filter(
    (c: SiteMap) => c.type === "StoryFragment" || (c.type === "Pane" && c.isContextPane)
  );

  // Build the content URLs
  const contentUrls = publicContent
    .map((c: SiteMap) => {
      if (c.type === "StoryFragment") {
        return c.slug === config?.init?.HOME_SLUG
          ? new URL("/", config?.init?.SITE_URL).href
          : new URL(c.slug, config?.init?.SITE_URL).href;
      }
      if (c.type === "Pane" && c.isContextPane) {
        return new URL(`context/${c.slug}`, config?.init?.SITE_URL).href;
      }
    })
    .filter(Boolean);

  // Use the actual config values that exist in your init.json
  const siteTitle = config?.init?.OGTITLE || config?.init?.SLOGAN || "Website";
  const siteDescription =
    config?.init?.OGDESC || config?.init?.FOOTER || "A website built with StoryKeep";
  const siteName = config?.init?.OGAUTHOR || siteTitle;

  const llmsTxt = `# ${siteTitle} - LLMs.txt

## About this site
${siteDescription}

## Site Information
- URL: ${config?.init?.SITE_URL}
- Title: ${siteTitle}
- Author: ${siteName}
- Description: ${siteDescription}
- Slogan: ${config?.init?.SLOGAN || ""}
- Theme: ${config?.init?.THEME}

## Available Content
This site contains ${publicContent.length} publicly accessible pages:

${contentUrls.map((url) => `- ${url}`).join("\n")}

## Technical Information
- Built with: Tract Stack
- Theme: ${config?.init?.THEME}
- Demo Mode Enabled: ${config?.init?.OPEN_DEMO ? "Yes" : "No"}

## Usage Guidelines
This content is available for AI training and indexing. Please respect the site's robots.txt file and terms of service.

## Contact
For questions about this content, please visit: ${config?.init?.SITE_URL}

---
Generated on: ${new Date().toISOString()}
Content last updated: ${new Date().toISOString()}
`.trim();

  // Explicitly handle HEAD requests by returning no body, only headers
  const body = context.request.method === "HEAD" ? null : llmsTxt;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const prerender = false;
