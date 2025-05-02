/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { dashboardAnalytics } from "@/utils/db/api/dashboardAnalytics";
import { streamEvents } from "@/utils/db/api/stream";
import { syncVisit } from "@/utils/db/api/syncVisit";
import { unlockProfile } from "@/utils/db/api/unlock";
import { createProfile } from "@/utils/db/api/create";
import { updateProfile } from "@/utils/db/api/update";
import { executeQueries } from "@/utils/db/api/executeQueries";
import { getAllFiles } from "@/utils/db/api/getAllFiles";
import { getResourceNodes } from "@/utils/db/api/getResourceNodes";
import { getAnalytics } from "@/utils/db/api/getAnalytics";
import { getPaneTemplateNode } from "@/utils/db/api/getPaneTemplateNode";
import { getAllBeliefNodes } from "@/utils/db/api/getAllBeliefNodes";
import { getAllMenus } from "@/utils/db/api/getAllMenus";
import { upsertBelief } from "@/utils/db/api/upsertBelief";
import { upsertFile } from "@/utils/db/api/upsertFile";
import { upsertMenu } from "@/utils/db/api/upsertMenu";
import { upsertPane } from "@/utils/db/api/upsertPane";
import { upsertStoryFragment } from "@/utils/db/api/upsertStoryFragment";
import { upsertResource } from "@/utils/db/api/upsertResource";
import { upsertTractStack } from "@/utils/db/api/upsertTractStack";
import { upsertBeliefNode } from "@/utils/db/api/upsertBeliefNode";
import { upsertFileNode } from "@/utils/db/api/upsertFileNode";
import { upsertMenuNode } from "@/utils/db/api/upsertMenuNode";
import { upsertPaneNode } from "@/utils/db/api/upsertPaneNode";
import { upsertStoryFragmentNode } from "@/utils/db/api/upsertStoryFragmentNode";
import { upsertResourceNode } from "@/utils/db/api/upsertResourceNode";
import { upsertTractStackNode } from "@/utils/db/api/upsertTractStackNode";
import { initializeContent } from "@/utils/db/turso";
import { getAllTopics } from "@/utils/db/api/getAllTopics";
import { getTopicsForStoryFragment } from "@/utils/db/api/getTopicsForStoryFragment";
import { linkTopicToStoryFragment } from "@/utils/db/api/linkTopicToStoryFragment";
import { unlinkTopicFromStoryFragment } from "@/utils/db/api/unlinkTopicFromStoryFragment";
import { upsertTopic } from "@/utils/db/api/upsertTopic";
import { computeLeadMetrics } from "@/utils/events/analyticsComputation";
import { getStoryFragmentDetails } from "@/utils/db/api/getStoryFragmentDetails";
import { getEpinetMetrics } from "@/utils/events/epinetAnalytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import { getAllPromotedEpinets } from "@/utils/db/api/getAllPromotedEpinets";
import { getEpinetById } from "@/utils/db/api/getEpinetById";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { deleteEpinet } from "@/utils/db/api/deleteEpinet";
import { loadHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader";
import { loadHourlyEpinetData } from "@/utils/events/epinetLoader";
import {
  formatHourKey,
  createEmptyLeadMetrics,
  hourlyAnalyticsStore,
  hourlyEpinetStore,
  isEpinetCacheValid,
  isAnalyticsCacheValid,
} from "@/store/analytics";

const PUBLIC_CONCIERGE_AUTH_SECRET = import.meta.env.PUBLIC_CONCIERGE_AUTH_SECRET;

const NO_BODY_OPERATIONS = ["initializeContent"] as const;

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const { tursoOperation } = context.params;

    const body = NO_BODY_OPERATIONS.includes(tursoOperation as (typeof NO_BODY_OPERATIONS)[number])
      ? undefined
      : await context.request.json();

    let result;
    switch (tursoOperation) {
      case "stream":
        result = await streamEvents(body, context);
        break;
      case "syncVisit":
        result = await syncVisit(body, context);
        break;
      case "executeQueries":
        result = await executeQueries(body, context);
        break;
      case "analytics":
        result = await getAnalytics(body.id, body.type, body.duration, context);
        break;
      case "dashboardAnalytics":
        result = await dashboardAnalytics(body, context);
        break;
      case "upsertFile":
        result = await upsertFile(body, context);
        break;
      case "upsertPane":
        result = await upsertPane(body, context);
        break;
      case "upsertStoryFragment":
        result = await upsertStoryFragment(body, context);
        break;
      case "upsertMenu":
        result = await upsertMenu(body, context);
        break;
      case "upsertResource":
        result = await upsertResource(body, context);
        break;
      case "upsertTractStack":
        result = await upsertTractStack(body, context);
        break;
      case "upsertBelief":
        result = await upsertBelief(body, context);
        break;
      case "upsertFileNode":
        result = await upsertFileNode(body, context);
        break;
      case "upsertPaneNode":
        result = await upsertPaneNode(body, context);
        break;
      case "upsertStoryFragmentNode":
        result = await upsertStoryFragmentNode(body, context);
        break;
      case "upsertMenuNode":
        result = await upsertMenuNode(body, context);
        break;
      case "upsertResourceNode":
        result = await upsertResourceNode(body, context);
        break;
      case "upsertTractStackNode":
        result = await upsertTractStackNode(body, context);
        break;
      case "upsertBeliefNode":
        result = await upsertBeliefNode(body, context);
        break;
      case "getPaneTemplateNode":
        result = await getPaneTemplateNode(body.id, context);
        break;
      case "unlock":
        result = await unlockProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET, context);
        break;
      case "upsertEpinet":
        result = await upsertEpinet(body, context);
        break;
      case "deleteEpinet":
        result = await deleteEpinet(body.id, context);
        break;
      case "create":
        result = await createProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET, context);
        // Check if result indicates email already exists
        if (result && "emailExists" in result) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Email already registered",
              emailExists: true,
            }),
            {
              status: 200, // Using 200 status instead of error status
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        break;
      case "update":
        result = await updateProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET, context);
        break;
      case "initializeContent":
        await initializeContent(context);
        result = true;
        break;
      case "upsertTopic":
        result = await upsertTopic(body.title, context);
        break;
      case "linkTopicToStoryFragment":
        result = await linkTopicToStoryFragment(body.storyFragmentId, body.topicId, context);
        break;
      case "unlinkTopicFromStoryFragment":
        result = await unlinkTopicFromStoryFragment(body.storyFragmentId, body.topicId, context);
        break;
      default:
        throw new Error(`Unknown operation: ${tursoOperation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${context.params.tursoOperation} route:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: error instanceof Error && error.message.includes("not found") ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export const GET: APIRoute = withTenantContext(async (context: APIContext) => {
  const { tursoOperation } = context.params;

  try {
    let result;
    switch (tursoOperation) {
      case "getResourceNodes": {
        const url = new URL(context.request.url);
        const slugs = url.searchParams.get("slugs")?.split(/[,|]/).filter(Boolean);
        const categories = url.searchParams.get("categories")?.split(/[,|]/).filter(Boolean);
        result = await getResourceNodes({ slugs, categories }, context);
        break;
      }
      case "getLeadMetrics": {
        const store = hourlyAnalyticsStore.get();
        const tenantId = context?.locals?.tenant?.id || "default";
        const isValid = isAnalyticsCacheValid(tenantId);
        const currentHour = formatHourKey(new Date());
        const tenantData = store.data[tenantId];

        if (isValid && tenantData && tenantData.lastFullHour === currentHour) {
          const leadMetrics = await computeLeadMetrics(context);
          return new Response(
            JSON.stringify({
              success: true,
              data: leadMetrics,
              status: "complete",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const hoursToLoad = tenantData && Object.keys(tenantData.contentData).length > 0 ? 1 : 672;
        const processingPromise = new Promise<void>(async (resolve) => {
          try {
            await loadHourlyAnalytics(hoursToLoad, context);
            resolve();
          } catch (error) {
            console.error("Error in background analytics processing:", error);
            resolve();
          }
        });

        processingPromise.catch((err) => console.error("Async analytics processing error:", err));

        // If we have prior data, compute metrics immediately using existing data
        if (tenantData && Object.keys(tenantData.contentData).length > 0) {
          const leadMetrics = await computeLeadMetrics(context);
          return new Response(
            JSON.stringify({
              success: true,
              data: leadMetrics,
              status: "refreshing",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // No prior data, return empty metrics
        return new Response(
          JSON.stringify({
            success: true,
            data: createEmptyLeadMetrics(),
            status: "loading",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "getEpinetMetrics": {
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        const durationParam = url.searchParams.get("duration") || "weekly";
        const duration = ["daily", "weekly", "monthly"].includes(durationParam)
          ? (durationParam as "daily" | "weekly" | "monthly")
          : "weekly";
        if (!id) {
          throw new Error("Missing required parameter: id");
        }
        const tenantId = context?.locals?.tenant?.id || "default";
        const store = hourlyEpinetStore.get();
        const isValid = isEpinetCacheValid(tenantId);
        const tenantData = store.data[tenantId];
        const currentHour = formatHourKey(new Date());

        if (
          isValid &&
          tenantData &&
          tenantData[id] &&
          store.lastFullHour[tenantId] === currentHour
        ) {
          const epinetData = await getEpinetMetrics(id, duration, context);
          return new Response(
            JSON.stringify({
              success: true,
              data: epinetData,
              status: "complete",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Cache exists but needs current hour refresh, or is empty
        const currentHourOnly = tenantData && Object.keys(tenantData).length > 0;
        const processingPromise = new Promise<void>(async (resolve) => {
          try {
            await loadHourlyEpinetData(672, context, currentHourOnly);
            resolve();
          } catch (error) {
            console.error("Error in background epinet processing:", error);
            resolve();
          }
        });

        processingPromise.catch((err) => console.error("Async epinet processing error:", err));

        // If we have prior data, compute metrics immediately using existing data
        if (tenantData && tenantData[id]) {
          const epinetData = await getEpinetMetrics(id, duration, context);
          return new Response(
            JSON.stringify({
              success: true,
              data: epinetData,
              status: "refreshing",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // No prior data, return minimal data
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id,
              title: "User Journey Flow (Loading...)",
              nodes: [],
              links: [],
            },
            status: "loading",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "getAllFiles":
        result = await getAllFiles(context);
        break;
      case "getAllMenus":
        result = await getAllMenus(context);
        break;
      case "getAllBeliefNodes":
        result = await getAllBeliefNodes(context);
        break;
      case "getAllTopics":
        result = await getAllTopics(context);
        break;
      case "getTopicsForStoryFragment": {
        const url = new URL(context.request.url);
        const storyFragmentId = url.searchParams.get("storyFragmentId");
        if (!storyFragmentId) {
          throw new Error("Missing required parameter: storyFragmentId");
        }
        result = await getTopicsForStoryFragment(storyFragmentId, context);
        break;
      }
      case "getStoryFragmentDetails": {
        const url = new URL(context.request.url);
        const storyFragmentId = url.searchParams.get("storyFragmentId");
        if (!storyFragmentId) {
          throw new Error("Missing required parameter: storyFragmentId");
        }
        result = await getStoryFragmentDetails(storyFragmentId, context);
        break;
      }
      case "getAllEpinets":
        result = await getAllEpinets(context);
        break;
      case "getAllPromotedEpinets":
        result = await getAllPromotedEpinets(context);
        break;
      case "getEpinetById": {
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        if (!id) {
          throw new Error("Missing required parameter: id");
        }
        result = await getEpinetById(id, context);
        break;
      }
      default:
        if (tursoOperation === "read") {
          return POST(context as any); // Type assertion for simplicity
        }
        throw new Error("Method not allowed");
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
