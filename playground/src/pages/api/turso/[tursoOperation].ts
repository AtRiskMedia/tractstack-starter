/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import { dashboardAnalytics } from "@/utils/db/api/dashboardAnalytics.ts";
import { streamEvents } from "@/utils/db/api/stream.ts";
import { syncVisit } from "@/utils/db/api/syncVisit.ts";
import { unlockProfile } from "@/utils/db/api/unlock.ts";
import { createProfile } from "@/utils/db/api/create.ts";
import { updateProfile } from "@/utils/db/api/update.ts";
import { executeQueries } from "@/utils/db/api/executeQueries.ts";
import { getAllFiles } from "@/utils/db/api/getAllFiles.ts";
import { getResourceNodes } from "@/utils/db/api/getResourceNodes.ts";
import { getAnalytics } from "@/utils/db/api/getAnalytics.ts";
import { getPaneTemplateNode } from "@/utils/db/api/getPaneTemplateNode.ts";
import { getAllBeliefNodes } from "@/utils/db/api/getAllBeliefNodes.ts";
import { getAllMenus } from "@/utils/db/api/getAllMenus.ts";
import { upsertBelief } from "@/utils/db/api/upsertBelief.ts";
import { upsertFile } from "@/utils/db/api/upsertFile.ts";
import { upsertMenu } from "@/utils/db/api/upsertMenu.ts";
import { upsertPane } from "@/utils/db/api/upsertPane.ts";
import { upsertStoryFragment } from "@/utils/db/api/upsertStoryFragment.ts";
import { upsertResource } from "@/utils/db/api/upsertResource.ts";
import { upsertTractStack } from "@/utils/db/api/upsertTractStack.ts";
import { upsertBeliefNode } from "@/utils/db/api/upsertBeliefNode.ts";
import { upsertFileNode } from "@/utils/db/api/upsertFileNode.ts";
import { upsertMenuNode } from "@/utils/db/api/upsertMenuNode.ts";
import { upsertPaneNode } from "@/utils/db/api/upsertPaneNode.ts";
import { upsertStoryFragmentNode } from "@/utils/db/api/upsertStoryFragmentNode.ts";
import { upsertResourceNode } from "@/utils/db/api/upsertResourceNode.ts";
import { upsertTractStackNode } from "@/utils/db/api/upsertTractStackNode.ts";
import { initializeContent } from "@/utils/db/turso.ts";
import { getAllTopics } from "@/utils/db/api/getAllTopics.ts";
import { getTopicsForStoryFragment } from "@/utils/db/api/getTopicsForStoryFragment.ts";
import { linkTopicToStoryFragment } from "@/utils/db/api/linkTopicToStoryFragment.ts";
import { unlinkTopicFromStoryFragment } from "@/utils/db/api/unlinkTopicFromStoryFragment.ts";
import { upsertTopic } from "@/utils/db/api/upsertTopic.ts";
import { getStoryFragmentDetails } from "@/utils/db/api/getStoryFragmentDetails.ts";

const PUBLIC_CONCIERGE_AUTH_SECRET = import.meta.env.PUBLIC_CONCIERGE_AUTH_SECRET;

// Operations that don't require a request body
const NO_BODY_OPERATIONS = ["initializeContent"] as const;

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { tursoOperation } = params;

    const body = NO_BODY_OPERATIONS.includes(tursoOperation as (typeof NO_BODY_OPERATIONS)[number])
      ? undefined
      : await request.json();

    let result;
    switch (tursoOperation) {
      case "stream":
        result = await streamEvents(body);
        break;
      case "syncVisit":
        result = await syncVisit(body);
        break;
      case "executeQueries":
        result = await executeQueries(body);
        break;
      case "analytics":
        result = await getAnalytics(body.id, body.type, body.duration);
        break;
      case "dashboardAnalytics":
        result = await dashboardAnalytics(body);
        break;
      case "upsertFile":
        result = await upsertFile(body);
        break;
      case "upsertPane":
        result = await upsertPane(body);
        break;
      case "upsertStoryFragment":
        result = await upsertStoryFragment(body);
        break;
      case "upsertMenu":
        result = await upsertMenu(body);
        break;
      case "upsertResource":
        result = await upsertResource(body);
        break;
      case "upsertTractStack":
        result = await upsertTractStack(body);
        break;
      case "upsertBelief":
        result = await upsertBelief(body);
        break;
      case "upsertFileNode":
        result = await upsertFileNode(body);
        break;
      case "upsertPaneNode":
        result = await upsertPaneNode(body);
        break;
      case "upsertStoryFragmentNode":
        result = await upsertStoryFragmentNode(body);
        break;
      case "upsertMenuNode":
        result = await upsertMenuNode(body);
        break;
      case "upsertResourceNode":
        result = await upsertResourceNode(body);
        break;
      case "upsertTractStackNode":
        result = await upsertTractStackNode(body);
        break;
      case "upsertBeliefNode":
        result = await upsertBeliefNode(body);
        break;
      case "getPaneTemplateNode":
        result = await getPaneTemplateNode(body.id);
        break;
      case "unlock":
        result = await unlockProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "create":
        result = await createProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "update":
        result = await updateProfile(body, PUBLIC_CONCIERGE_AUTH_SECRET);
        break;
      case "initializeContent":
        await initializeContent();
        result = true;
        break;
      case "upsertTopic":
        result = await upsertTopic(body.title);
        break;
      case "linkTopicToStoryFragment":
        result = await linkTopicToStoryFragment(body.storyFragmentId, body.topicId);
        break;
      case "unlinkTopicFromStoryFragment":
        result = await unlinkTopicFromStoryFragment(body.storyFragmentId, body.topicId);
        break;
      default:
        throw new Error(`Unknown operation: ${tursoOperation}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in turso ${params.tursoOperation} route:`, error);
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
};

export const GET: APIRoute = async ({ params, request }) => {
  const { tursoOperation } = params;

  try {
    let result;
    switch (tursoOperation) {
      case "getResourceNodes": {
        const url = new URL(request.url);
        const slugs = url.searchParams.get("slugs")?.split(/[,|]/).filter(Boolean);
        const categories = url.searchParams.get("categories")?.split(/[,|]/).filter(Boolean);
        result = await getResourceNodes({ slugs, categories });
        break;
      }
      case "getAllFiles":
        result = await getAllFiles();
        break;
      case "getAllMenus":
        result = await getAllMenus();
        break;
      case "getAllBeliefNodes":
        result = await getAllBeliefNodes();
        break;
      case "getAllTopics":
        result = await getAllTopics();
        break;
      case "getTopicsForStoryFragment": {
        const url = new URL(request.url);
        const storyFragmentId = url.searchParams.get("storyFragmentId");
        if (!storyFragmentId) {
          throw new Error("Missing required parameter: storyFragmentId");
        }
        result = await getTopicsForStoryFragment(storyFragmentId);
        break;
      }
      case "getStoryFragmentDetails": {
        const url = new URL(request.url);
        const storyFragmentId = url.searchParams.get("storyFragmentId");
        if (!storyFragmentId) {
          throw new Error("Missing required parameter: storyFragmentId");
        }
        result = await getStoryFragmentDetails(storyFragmentId);
        break;
      }
      default:
        if (tursoOperation === "read") {
          return POST({
            request: new Request("http://dummy"),
            params,
            redirect: () => new Response(),
          } as any);
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
};
