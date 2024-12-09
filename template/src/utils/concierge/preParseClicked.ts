//import type {LispTokens} from '../../types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseClicked = (id: string, payload: any) => {
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
          console.log(`preParseClicked NEEDS CONFIG`);
          return {
            id: id,
            type: `PaneClicked`,
            verb: `CLICKED`,
            targetSlug: import.meta.env.PUBLIC_HOME,
          };

        case `storyFragment`:
        case `storyFragmentPane`:
          return {
            id: id,
            type: `PaneClicked`,
            verb: `CLICKED`,
            targetSlug: parameterTwo,
          };

        case `storykeep`:
        case `bunny`:
        case `bunnyContext`:
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
