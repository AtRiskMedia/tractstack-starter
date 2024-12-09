interface ShapeOptionsDatum {
  id: string;
  artpackMode?: string;
  styles?: {
    fill?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    WebkitMaskImage?: string;
    maskImage?: string;
    maskRepeat?: string;
    WebkitMaskSize?: string;
    maskSize?: string;
  };
  shapeName: string;
  classNamesParent?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function cleanShapeOptionsDatum(data: any): ShapeOptionsDatum | null {
  if (
    typeof data.id === "string" &&
    (data.artpackMode === undefined || typeof data.artpackMode === "string") &&
    (data.styles === undefined ||
      (typeof data.styles === "object" &&
        (data.styles.fill === undefined || typeof data.styles.fill === "string") &&
        (data.styles.backgroundImage === undefined ||
          typeof data.styles.backgroundImage === "string") &&
        (data.styles.backgroundSize === undefined ||
          typeof data.styles.backgroundSize === "string") &&
        (data.styles.WebkitMaskImage === undefined ||
          typeof data.styles.WebkitMaskImage === "string") &&
        (data.styles.maskImage === undefined || typeof data.styles.maskImage === "string") &&
        (data.styles.maskRepeat === undefined || typeof data.styles.maskRepeat === "string") &&
        (data.styles.WebkitMaskSize === undefined ||
          typeof data.styles.WebkitMaskSize === "string") &&
        (data.styles.maskSize === undefined || typeof data.styles.maskSize === "string"))) &&
    typeof data.shapeName === "string" &&
    (data.classNamesParent === undefined || typeof data.classNamesParent === "string")
  ) {
    return data as ShapeOptionsDatum;
  }
  return null;
}
