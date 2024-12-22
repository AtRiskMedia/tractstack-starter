/* eslint-disable @typescript-eslint/no-explicit-any */
export const getVisualBreak = (payload: any) => {
  if (!payload.desktop && !payload.tablet && !payload.mobile) {
    throw new Error("Art pack must contain at least one of: desktop, tablet, or mobile");
  }
  const reduceBreakpoint = (data: any) => {
    if (!data) return null;
    if (data.mode !== "break") {
      throw new Error('Mode must be "break" for all breakpoints');
    }
    return {
      collection: data.collection,
      image: data.image,
      svgFill: data.svgFill,
    };
  };
  return {
    breakDesktop: reduceBreakpoint(payload.desktop),
    breakTablet: reduceBreakpoint(payload.tablet),
    breakMobile: reduceBreakpoint(payload.mobile),
  };
};
