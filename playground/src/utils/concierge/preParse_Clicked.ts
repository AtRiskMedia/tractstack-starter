/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Config } from "@/types.ts";

export const preParseClicked = (id: string, payload: any, config: Config) => {
  const thisPayload = (payload && payload[0]) || false;

  if (!thisPayload || !config?.init?.HOME_SLUG) {
    return null;
  }

  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;

  if (command === "bunnyMoment" && parameters) {
    const videoId = parameters[0];
    return {
      id: id,
      type: `StartVideoMoment`,
      verb: `WATCHED`,
      targetId: videoId || null,
    };
  }

  if (command === `goto` && parameters) {
    const parameterOne = parameters[0] || null;
    const parameterTwo = parameters[1] || null;
    //const parameterThree = parameters[2] || null;

    switch (parameterOne) {
      case `home`:
        return {
          id: id,
          type: `PaneClicked`,
          verb: `CLICKED`,
          targetSlug: config?.init?.HOME_SLUG,
        };

      case `storyFragment`:
      case `storyFragmentPane`:
        return {
          id: id,
          type: `PaneClicked`,
          verb: `CLICKED`,
          targetSlug: parameterTwo,
        };

      case `bunny`:
        return {
          id: id,
          type: `StartVideo`,
          verb: `WATCHED`,
          targetSlug: parameterTwo,
        };

      case `sandbox`:
        return {
          id: id,
          type: `SandboxAction`,
          verb: `CLICKED`,
          targetSlug: parameterTwo || "main",
        };

      case `storykeep`:
      case `context`:
      case `concierge`:
      case `product`:
      case `url`:
        // ignore these
        break;

      default:
        console.log(`LispActionPayload preParseEvent misfire`, command, parameters);
        break;
    }
  }

  return null;
};
