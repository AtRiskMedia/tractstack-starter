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
import { getAllEpinets } from "@/utils/db/api/getAllEpinets";
import { getAllPromotedEpinets } from "@/utils/db/api/getAllPromotedEpinets";
import { getEpinetById } from "@/utils/db/api/getEpinetById";
import { upsertEpinet } from "@/utils/db/api/upsertEpinet";
import { deleteEpinet } from "@/utils/db/api/deleteEpinet";
import { getAllAnalytics } from "@/utils/db/api/getAllAnalytics";
import { getPanelAnalytics } from "@/utils/db/api/panelAnalytics";
import {
  computeStoryfragmentAnalytics,
  createEmptyDashboardAnalytics,
} from "@/utils/events/dashboardAnalytics";
import { isEpinetCacheValid, createEmptyLeadMetrics } from "@/store/analytics";
import { getEpinetCustomMetrics } from "@/utils/events/epinetAnalytics";
import { loadHourlyEpinetData } from "@/utils/events/epinetLoader";
import type { EpinetContentMap } from "@/types";

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

        try {
          const analyticsData = await getAllAnalytics(durationParam, context);

          // Type guard not needed anymore as epinet is removed

          // Check if the data is empty (but don't change the status)
          const isEmpty =
            analyticsData.dashboard &&
            (!analyticsData.dashboard.line?.length ||
              analyticsData.dashboard.line.every(
                (series) => !series.data?.length || series.data.every((point) => point.y === 0)
              )) &&
            !analyticsData.dashboard.hot_content?.length &&
            analyticsData.dashboard.stats.daily === 0 &&
            analyticsData.dashboard.stats.weekly === 0 &&
            analyticsData.dashboard.stats.monthly === 0;

          // Preserve original status from analyticsData
          result = {
            dashboard: analyticsData.dashboard,
            leads: analyticsData.leads,
          };

          return new Response(
            JSON.stringify({
              success: true,
              data: result,
              status: analyticsData.status, // Keep original status
              isEmpty: isEmpty, // Just add the isEmpty flag
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

      case "getEpinetCustomMetrics": {
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        const visitorType = (url.searchParams.get("visitorType") || "all") as
          | "all"
          | "anonymous"
          | "known";
        const selectedUserId = url.searchParams.get("userId");
        const startHourParam = url.searchParams.get("startHour");
        const endHourParam = url.searchParams.get("endHour");

        // If no epinet ID is provided, find the first promoted epinet
        let epinetId = id;
        if (!epinetId) {
          const contentMap = await getFullContentMap(context);
          const promotedEpinet = contentMap.find(
            (item) =>
              (item as EpinetContentMap).type === "Epinet" && (item as EpinetContentMap).promoted
          );
          if (promotedEpinet) {
            epinetId = promotedEpinet.id;
          } else {
            // If no promoted epinet, get the first epinet from getAllEpinets
            const allEpinets = await getAllEpinets(context);
            if (allEpinets && allEpinets.length > 0) {
              epinetId = allEpinets[0].id;
            }
          }
        }
        if (!epinetId) {
          throw new Error("No epinet ID provided and no default epinet found");
        }

        // Parse hour parameters if provided
        const startHour = startHourParam ? parseInt(startHourParam, 10) : null;
        const endHour = endHourParam ? parseInt(endHourParam, 10) : null;

        try {
          const tenantId = context?.locals?.tenant?.id || "default";
          const isEpinetValid = isEpinetCacheValid(tenantId);

          // Check if we need to refresh epinet data
          if (!isEpinetValid) {
            await loadHourlyEpinetData(context).catch((err) =>
              console.error("Error loading epinet data:", err)
            );
          }
          const metricsData = await getEpinetCustomMetrics(
            epinetId,
            {
              visitorType,
              selectedUserId,
              startHour,
              endHour,
            },
            context
          );

          return new Response(
            JSON.stringify({
              success: true,
              data: metricsData,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("Error in getEpinetCustomMetrics:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "An unknown error occurred",
              data: {
                epinet: {
                  status: "error",
                  message: "Failed to compute custom epinet metrics",
                  epinetId,
                  title: "User Journey Flow (Error)",
                },
                userCounts: [],
                hourlyNodeActivity: {},
              },
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

      case "getStoryfragmentAnalytics": {
        try {
          const analyticsData = await computeStoryfragmentAnalytics(context);

          return new Response(
            JSON.stringify({
              success: true,
              data: analyticsData,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("Error getting storyfragment analytics:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "An unknown error occurred",
              data: [],
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
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
