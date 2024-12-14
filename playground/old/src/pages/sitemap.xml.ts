import { getContentMap } from "../api/turso";
import { dateToUnixTimestamp, formatDateToYYYYMMDD } from "../utils/helpers";
import type { APIRoute } from "astro";
import type { ContentMap } from "../types";

const xmlTop = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`.trim();
const xmlBottom = `</urlset>`;

const contentMap: ContentMap[] = await getContentMap();
const entries = contentMap
  .map((c: ContentMap) => {
    if (c.type === `StoryFragment`) {
      const thisPriority = c.slug === import.meta.env.PUBLIC_HOME ? `1.0` : `0.8`;
      const thisUrl =
        c.slug === import.meta.env.PUBLIC_HOME
          ? new URL(`/`, import.meta.env.PUBLIC_SITE_URL).href
          : new URL(c.slug, import.meta.env.PUBLIC_SITE_URL).href;
      const thisChanged = (c?.changed && dateToUnixTimestamp(c.changed)) || 0;
      const thisCreated = dateToUnixTimestamp(c.created);
      const daysDelta = (thisChanged - thisCreated) / (1000 * 60 * 60 * 24);
      const formatted = formatDateToYYYYMMDD(c.changed || c.created);
      const thisFreq =
        daysDelta < 3 ? `daily` : daysDelta < 10 ? `weekly` : daysDelta < 90 ? `monthly` : `yearly`;
      return `<url><loc>${thisUrl}</loc><lastmod>${formatted}</lastmod><changefreq>${thisFreq}</changefreq><priority>${thisPriority}</priority></url>`;
    }
    if (c.type === `Pane` && c.isContextPane) {
      const thisUrl = new URL(`context/${c.slug}`, import.meta.env.PUBLIC_SITE_URL).href;
      const thisChanged = (c?.changed && dateToUnixTimestamp(c.changed)) || 0;
      const thisCreated = dateToUnixTimestamp(c.created);
      const daysDelta = (thisChanged - thisCreated) / (1000 * 60 * 60 * 24);
      const formatted = formatDateToYYYYMMDD(c.changed || c.created);
      const thisFreq =
        daysDelta < 3 ? `daily` : daysDelta < 10 ? `weekly` : daysDelta < 90 ? `monthly` : `yearly`;
      return `<url><loc>${thisUrl}</loc><lastmod>${formatted}</lastmod><changefreq>${thisFreq}</changefreq><priority>0.4</priority></url>`;
    }
  })
  .filter((n) => n);

const xmlBody = entries.join(``);
const xml = `${xmlTop}${xmlBody}${xmlBottom}`;

export const GET: APIRoute = () => {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
