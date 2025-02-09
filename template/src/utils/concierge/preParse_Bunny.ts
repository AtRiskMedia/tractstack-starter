/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseBunny = (
  payload: any
): {
  slug: string;
  t: string;
  videoId: string | null;
  isContext: boolean;
} | null => {
  const thisPayload = (payload && payload[0]) || false;
  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;
  const parameterOne = (parameters && parameters[0]) || null;
  const parameterTwo = (parameters && parameters[1]) || null;
  const parameterThree = (parameters && parameters[2]) || null;
  const parameterFour = (parameters && parameters[3]) || null; // video ID parameter

  if (command == `goto` && [`bunny`, `bunnyContext`].includes(parameterOne)) {
    return {
      slug: parameterTwo as string,
      t: parameterThree as string,
      videoId: parameterFour as string | null,
      isContext: parameterOne === `bunnyContext`,
    };
  }
  return null;
};
