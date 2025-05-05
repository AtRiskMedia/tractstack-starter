/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import type { APIContext } from "@/types";
import { withTenantContext } from "@/utils/api/middleware";
import { streamEvents } from "@/utils/db/api/stream";
import { syncVisit } from "@/utils/db/api/syncVisit";
import { unlockProfile } from "@/utils/db/api/unlock";
import { createProfile } from "@/utils/db/api/create";
import { updateProfile } from "@/utils/db/api/update";
import { executeQueries } from "@/utils/db/api/executeQueries";
import { getAllFiles } from "@/utils/db/api/getAllFiles";
import { getResourceNodes } from "@/utils/db/api/getResourceNodes";
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
import { initializeContent, getFullContentMap } from "@/utils/db/turso";
//import { getAllTopics } from "@/utils/db/api/getAllTopics";
//import { getTopicsForStoryFragment } from "@/utils/db/api/getTopicsForStoryFragment";
//import { linkTopicToStoryFragment } from "@/utils/db/api/linkTopicToStoryFragment";
//import { unlinkTopicFromStoryFragment } from "@/utils/db/api/unlinkTopicFromStoryFragment";
//import { upsertTopic } from "@/utils/db/api/upsertTopic";
//import { getStoryFragmentDetails } from "@/utils/db/api/getStoryFragmentDetails";
import { computeLeadMetrics } from "@/utils/events/analyticsComputation";
import { getEpinetMetrics } from "@/utils/events/epinetAnalytics";
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import { getAllPromotedEpinets } from "@/utils/db/api/getAllPromotedEpinets";
import { getEpinetById } from "@/utils/db/api/getEpinetById";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { deleteEpinet } from "@/utils/db/api/deleteEpinet";
import {
  computeDashboardAnalytics,
  createEmptyDashboardAnalytics,
} from "@/utils/events/dashboardAnalytics";
import { loadHourlyAnalytics } from "@/utils/events/hourlyAnalyticsLoader";
import { loadHourlyEpinetData } from "@/utils/events/epinetLoader";
import { getPanelAnalytics } from "@/utils/db/api/panelAnalytics";
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
      //case "upsertTopic":
      //  result = await upsertTopic(body.title, context);
      //  break;
      //case "linkTopicToStoryFragment":
      //  result = await linkTopicToStoryFragment(body.storyFragmentId, body.topicId, context);
      //  break;
      //case "unlinkTopicFromStoryFragment":
      //  result = await unlinkTopicFromStoryFragment(body.storyFragmentId, body.topicId, context);
      //  break;
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

      case "getAllAnalytics": {
        const url = new URL(context.request.url);
        const durationParam = url.searchParams.get("duration") || "weekly";
        const duration = ["daily", "weekly", "monthly"].includes(durationParam)
          ? (durationParam as "daily" | "weekly" | "monthly")
          : "weekly";

        try {
          const tenantId = context?.locals?.tenant?.id || "default";
          const isAnalyticsValid = isAnalyticsCacheValid(tenantId);
          const isEpinetValid = isEpinetCacheValid(tenantId);
          const analyticStore = hourlyAnalyticsStore.get();
          const epinetStore = hourlyEpinetStore.get();
          const currentHour = formatHourKey(new Date());
          const tenantAnalyticsData = analyticStore.data[tenantId];
          const tenantEpinetData = epinetStore.data[tenantId];

          // Find the first promoted epinet ID for epinet data
          const contentItems = await getFullContentMap(context);
          const epinets = contentItems.filter(
            (item: any) => item.type === "Epinet" && item.promoted
          );
          const epinetId = epinets.length > 0 ? epinets[0].id : null;

          // Check if all data is fresh and complete
          if (
            isAnalyticsValid &&
            tenantAnalyticsData &&
            tenantAnalyticsData.lastFullHour === currentHour &&
            isEpinetValid &&
            epinetId &&
            tenantEpinetData &&
            tenantEpinetData[epinetId] &&
            epinetStore.lastFullHour[tenantId] === currentHour
          ) {
            // All data is fresh
            const [dashboardData, leadMetrics, epinetData] = await Promise.all([
              computeDashboardAnalytics(duration, context),
              computeLeadMetrics(context),
              epinetId ? getEpinetMetrics(epinetId, duration, context) : null,
            ]);

            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  dashboard: dashboardData,
                  leads: leadMetrics,
                  epinet: epinetData,
                },
                status: "complete",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Refresh data in the background if needed
          const needsAnalyticsRefresh =
            !isAnalyticsValid ||
            !tenantAnalyticsData ||
            tenantAnalyticsData.lastFullHour !== currentHour;

          const needsEpinetRefresh =
            !isEpinetValid ||
            !tenantEpinetData ||
            !epinetId ||
            !tenantEpinetData[epinetId] ||
            epinetStore.lastFullHour[tenantId] !== currentHour;

          const hoursToLoad =
            tenantAnalyticsData && Object.keys(tenantAnalyticsData.contentData).length > 0
              ? 1
              : 672;
          const epinetHoursToLoad = tenantEpinetData && Object.keys(tenantEpinetData).length > 0;

          // Start background processing
          const processingPromises = [];

          if (needsAnalyticsRefresh) {
            processingPromises.push(
              loadHourlyAnalytics(hoursToLoad, context).catch((err) =>
                console.error("Async analytics processing error:", err)
              )
            );
          }

          if (needsEpinetRefresh && epinetId) {
            processingPromises.push(
              loadHourlyEpinetData(672, context, epinetHoursToLoad).catch((err) =>
                console.error("Async epinet processing error:", err)
              )
            );
          }

          // Start processing in background
          Promise.all(processingPromises).catch((err) =>
            console.error("Error in background processing:", err)
          );

          const [dashboardData, leadMetrics, epinetData] = await Promise.all([
            tenantAnalyticsData
              ? computeDashboardAnalytics(duration, context)
              : createEmptyDashboardAnalytics(),
            tenantAnalyticsData ? computeLeadMetrics(context) : createEmptyLeadMetrics(),
            epinetId && tenantEpinetData && tenantEpinetData[epinetId]
              ? getEpinetMetrics(epinetId, duration, context)
              : {
                  id: epinetId || "unknown",
                  title: "User Journey Flow (Loading...)",
                  nodes: [],
                  links: [],
                },
          ]);

          const status = needsAnalyticsRefresh || needsEpinetRefresh ? "refreshing" : "complete";

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                dashboard: dashboardData,
                leads: leadMetrics,
                epinet: epinetData,
              },
              status: status,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("Error in getAllAnalytics:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "An unknown error occurred",
              data: {
                dashboard: createEmptyDashboardAnalytics(),
                leads: createEmptyLeadMetrics(),
                epinet: null,
              },
              status: "error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      case "getPanelAnalytics": {
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        const type = url.searchParams.get("type") as "pane" | "storyfragment";
        const duration = url.searchParams.get("duration") || "weekly";

        if (!id) {
          throw new Error("Missing required parameter: id");
        }

        if (!type || (type !== "pane" && type !== "storyfragment")) {
          throw new Error("Invalid or missing parameter: type (must be 'pane' or 'storyfragment')");
        }

        result = await getPanelAnalytics(id, type, duration, context);
        break;
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
      //case "getAllTopics":
      //  result = await getAllTopics(context);
      //  break;
      //case "getTopicsForStoryFragment": {
      //  const url = new URL(context.request.url);
      //  const storyFragmentId = url.searchParams.get("storyFragmentId");
      //  if (!storyFragmentId) {
      //    throw new Error("Missing required parameter: storyFragmentId");
      //  }
      //  result = await getTopicsForStoryFragment(storyFragmentId, context);
      //  break;
      //}
      //case "getStoryFragmentDetails": {
      //  const url = new URL(context.request.url);
      //  const storyFragmentId = url.searchParams.get("storyFragmentId");
      //  if (!storyFragmentId) {
      //    throw new Error("Missing required parameter: storyFragmentId");
      //  }
      //  result = await getStoryFragmentDetails(storyFragmentId, context);
      //  break;
      //}
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
          return POST(context as any);
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
