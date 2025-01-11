import colorConfig from "../../../config/tailwindColors.json";

type TailwindColorPalette = {
  [colorName: string]: string[];
};

function getBrandColours(brand: string | null): string[] {
  const defaultColors = colorConfig.defaultColors;
  if (brand && typeof brand === "string") {
    const hexColorRegex = /^([A-Fa-f0-9]{6}(?:,[A-Fa-f0-9]{6})*)$/;
    if (hexColorRegex.test(brand)) {
      return brand.split(",");
    } else {
      console.error(
        "Does not match the expected format of hexadecimal colors separated by commas."
      );
    }
  }
  return defaultColors;
}

export function getBrandColor(colorVar: string, brand: string | null): string | null {
  const brandColours = getBrandColours(brand);
  const colorName = colorVar.replace("var(--brand-", "").replace(")", "");
  const index = parseInt(colorName) - 1;
  return index >= 0 && index < brandColours.length ? brandColours[index] : null;
}

export const COLOR_STYLES = colorConfig.colorStyles;
export type ColorStyle = (typeof COLOR_STYLES)[number];

export const customColors = colorConfig.customColors;
export const tailwindColors: TailwindColorPalette = colorConfig.tailwindColors;

export const getTailwindColorOptions = () => {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const standardColors = Object.entries(tailwindColors).flatMap(([colorName, colorShades]) =>
    shades
      .filter((shade) => {
        const index = shade === 50 ? 0 : shade === 950 ? 10 : shade / 100 - 1;
        return colorShades[index] !== undefined;
      })
      .map((shade) => `${colorName}-${shade}`)
  );
  const customColorOptions = Object.keys(customColors).map((color) => color);
  return [...standardColors, ...customColorOptions];
};

export const tailwindToHex = (tailwindColor: string, brand: string | null): string => {
  if (tailwindColor.startsWith("bg-brand-")) {
    const brandColor = getBrandColor(`var(--${tailwindColor.slice(3)})`, brand);
    if (brandColor) {
      return `#${brandColor}`;
    }
  }
  if (tailwindColor.startsWith("brand-")) {
    const brandColor = getBrandColor(`var(--${tailwindColor})`, brand);
    if (brandColor) {
      return `#${brandColor}`;
    }
  }
  if (tailwindColor in customColors) {
    const color = customColors[tailwindColor as keyof typeof customColors];
    if (color.startsWith("var(--")) {
      const brandColor = getBrandColor(color, brand);
      if (brandColor) {
        return `#${brandColor}`;
      }
    }
    return color;
  }

  if (tailwindColor.startsWith("bg-")) {
    tailwindColor = tailwindColor.slice(3);
  }
  if (tailwindColor in customColors) {
    return customColors[tailwindColor as keyof typeof customColors];
  }
  const [color, shade] = tailwindColor.split("-");
  if (color in tailwindColors) {
    const shadeIndex = shade === "50" ? 0 : shade === "950" ? 10 : parseInt(shade) / 100 - 1;
    return tailwindColors[color as keyof typeof tailwindColors][shadeIndex];
  }
  return tailwindColor.startsWith("#") ? tailwindColor : `#${tailwindColor}`;
};

export const hexToTailwind = (hexColor: string): string | null => {
  for (const [colorName, colorHex] of Object.entries(customColors)) {
    if (colorHex.toLowerCase() === hexColor.toLowerCase()) {
      return colorName;
    }
  }
  for (const [colorName, shades] of Object.entries(tailwindColors)) {
    const index = shades.findIndex((shade) => shade.toLowerCase() === hexColor.toLowerCase());
    if (index !== -1) {
      const shade = index === 0 ? 50 : index === 10 ? 950 : (index + 1) * 100;
      return `${colorName}-${shade}`;
    }
  }
  return null;
};

export const colorValues = getTailwindColorOptions();
