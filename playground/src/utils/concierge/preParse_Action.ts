/* eslint-disable @typescript-eslint/no-explicit-any */
import type { /* LispTokens, */ Config } from "@/types.ts";

export const preParseAction = (payload: any, slug: string, isContext: boolean, config: Config) => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  const parameterThree = (parameters && parameters[2]) || null;
  //const parameterFour = (parameters && parameters[3]) || null;

  switch (command) {
    case `goto`:
      switch (parameterOne) {
        case `storykeep`:
          if (parameterTwo) {
            switch (parameterTwo) {
              case `dashboard`:
                return `/storykeep`;
              case `settings`:
                return `/storykeep/settings`;
              case `login`:
                return `/storykeep/login?force=true`;
              case `logout`:
                return `/storykeep/logout`;
              default:
                console.log(`LispActionPayload preParse misfire`, payload);
            }
          }
          if (!isContext) return `/${slug}/edit`;
          return `/context/${slug}/edit`;
        case `home`:
          return `/`;
        case `concierge`:
          return `/concierge/${parameterTwo}`;
        case `context`:
          return `/context/${parameterTwo}`;
        //case `product`:
        //  return `/products/${parameterTwo}`;
        case `storyFragment`:
          if (parameterTwo !== config?.init?.HOME_SLUG) return `/${parameterTwo}`;
          return `/`;
        case `storyFragmentPane`:
          if (parameterTwo && parameterThree) {
            if (parameterTwo !== config?.init?.HOME_SLUG)
              return `/${parameterTwo}#${parameterThree}`;
            return `/#${parameterThree}`;
          }
          console.log(
            `LispActionPayload preParse misfire on goto storyFragmentPane`,
            parameterTwo,
            parameterThree
          );
          break;
        case `bunny`:
          if (parameterTwo && parameterThree) return `/${parameterTwo}?t=${parameterThree}s`;
          return null;
        case `url`:
          return parameterTwo;
        case `sandbox`:
          if (parameterTwo) {
            switch (parameterTwo) {
              case `claim`:
                return `/sandbox/claim`;
            }
          }
          return ``;
        default:
          console.log(`LispActionPayload preParse misfire on goto`, payload);
      }
      break;
    default:
      console.log(`LispActionPayload preParse misfire`, payload);
      break;
  }
  return ``;
};
