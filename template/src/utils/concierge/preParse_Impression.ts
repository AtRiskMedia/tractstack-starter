/* eslint-disable @typescript-eslint/no-explicit-any */
import type { /* LispTokens, */ Config } from "../../types.ts";

export const preParseImpression = (
  id: string,
  title: string,
  parentId: string,
  payload: any,
  config: Config
) => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  //const parameterThree = (parameters && parameters[2]) || null;

  if (!config?.init?.HOME_SLUG) {
    console.log(`Site misconfiguration: HOME_SLUG not found`);
    return null;
  }

  switch (command) {
    case `goto`: {
      switch (parameterOne) {
        case `home`:
          console.log(`preParseImpression NEEDS CONFIG`);
          return {
            id: id,
            parentId: parentId,
            title,
            type: `Impression`,
            verb: `CLICKED`,
            targetSlug: config?.init?.HOME_SLUG,
          };

        case `storyFragment`:
        case `storyFragmentPane`:
          return {
            id: id,
            parentId: parentId,
            title,
            type: `Impression`,
            verb: `CLICKED`,
            targetSlug: parameterTwo,
          };

        case `context`:
        case `concierge`:
        case `product`:
        case `url`:
          // ignore these
          break;

        default:
          console.log(`LispActionPayload preParseImpression misfire`, command, parameters);
          break;
      }
    }
  }
  return null;
};
