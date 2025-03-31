/* eslint-disable @typescript-eslint/no-explicit-any */
export const preParseBunny = (
  payload: any
): {
  t: string;
  videoId: string | null;
  slug?: string;
  isContext?: boolean;
} | null => {
  const thisPayload = (payload && payload[0]) || false;

  // Early exit if no valid payload
  if (!thisPayload) return null;

  const command = (thisPayload && thisPayload[0] && thisPayload[0][0]) || null;
  const parameters = (thisPayload && thisPayload[0] && thisPayload[0][1]) || null;

  // Handle legacy format: (goto (bunny crusade-2024-june-24 1623 252933/65c99d97-8aec-4084-b47a-3dc4c5dd3e09))
  if (command === `goto` && parameters) {
    const parameterOne = parameters[0] || null;
    const parameterTwo = parameters[1] || null;
    const parameterThree = parameters[2] || null;
    const parameterFour = parameters[3] || null; // video ID parameter

    if ([`bunny`, `bunnyContext`].includes(parameterOne)) {
      return {
        slug: parameterTwo as string,
        t: parameterThree as string,
        videoId: parameterFour as string | null,
        isContext: parameterOne === `bunnyContext`,
      };
    }
  }

  // Handle new format: (bunnyMoment (252933/65c99d97-8aec-4084-b47a-3dc4c5dd3e09 1623))
  if (command === "bunnyMoment" && parameters) {
    if (Array.isArray(parameters)) {
      const videoId = parameters[0];
      const timestamp = parameters[1];

      return {
        videoId: videoId || null,
        t: timestamp ? timestamp.toString() : "0",
      };
    }
  }

  return null;
};
