//import type {LispTokens} from '../../types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseAction = (payload: any, slug: string, isContext: boolean) => {
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
        case `product`:
          return `/products/${parameterTwo}`;
        case `storyFragment`:
          if (parameterTwo !== import.meta.env.PUBLIC_HOME) return `/${parameterTwo}`;
          return `/`;
        case `storyFragmentPane`:
          if (parameterTwo && parameterThree) {
            if (parameterTwo !== import.meta.env.PUBLIC_HOME)
              return `/${parameterTwo}#${parameterThree}`;
            return `/#${parameterThree}`;
          }
          console.log(`LispActionPayload preParse misfire on goto`, payload);
          break;
        case `bunny`:
          if (parameterTwo && parameterThree) {
            if (parameterTwo !== import.meta.env.PUBLIC_HOME)
              return `/${parameterTwo}?t=${parameterThree}s#bunny`;
            return `/?t=${parameterThree}s#bunny`;
          }
          console.log(`LispActionPayload preParse misfire on goto`, payload);
          break;
        case `bunnyContext`:
          if (parameterTwo && parameterThree)
            return `/context/${parameterTwo}?t=${parameterThree}s#bunny`;
          console.log(`LispActionPayload preParse misfire on goto`, payload);
          break;
        case `url`:
          return parameterTwo;
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
