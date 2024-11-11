//import type {LispTokens} from '../../types.ts';
/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseImpression = (id: string, title: string, parentId: string, payload: any) => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  //const parameterThree = (parameters && parameters[2]) || null;

  switch (command) {
    case `goto`: {
      switch (parameterOne) {
        case `home`:
          return {
            id: id,
            parentId: parentId,
            title,
            type: `Impression`,
            verb: `CLICKED`,
            targetSlug: import.meta.env.PUBLIC_HOME,
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
