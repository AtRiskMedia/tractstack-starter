import type { /* LispTokens, */ Config } from "../../types.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseClicked = (id: string, payload: any, config: Config) => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  //const parameterThree = (parameters && parameters[2]) || null;

  if (!config?.init?.HOME_SLUG) {
    return null;
  }

  switch (command) {
    case `goto`: {
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
  }
  return null;
};
