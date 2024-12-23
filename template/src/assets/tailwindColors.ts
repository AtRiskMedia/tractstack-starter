import { getEnvValue } from "../utils/preview-brand.ts";

type TailwindColorPalette = {
  [colorName: string]: string[];
};

const defaultColors = [
  "#10120d",
  "#fcfcfc",
  "#f58333",
  "#c8df8c",
  "#293f58",
  "#a7b1b7",
  "#393d34",
  "#e3e3e3",
];
const envBrand = import.meta.env.PUBLIC_BRAND;
const brandColours: string[] = (() => {
  const PREVIEW_BRAND = getEnvValue(`PUBLIC_BRAND`);
  const thisBrand = PREVIEW_BRAND || envBrand;
  if (thisBrand && typeof thisBrand === "string") {
    const hexColorRegex = /^([A-Fa-f0-9]{6}(?:,[A-Fa-f0-9]{6})*)$/;
    if (hexColorRegex.test(thisBrand)) {
      return thisBrand.split(",");
    } else {
      console.error(
        "Does not match the expected format of hexadecimal colors separated by commas."
      );
    }
  }
  return defaultColors;
})();

export function getBrandColor(colorVar: string): string | null {
  const colorName = colorVar.replace("var(--brand-", "").replace(")", "");
  const index = parseInt(colorName) - 1;
  return index >= 0 && index < brandColours.length ? brandColours[index] : null;
}

export const COLOR_STYLES = [
  "textCOLOR",
  "bgCOLOR",
  "textDECORATIONCOLOR",
  "accentCOLOR",
  "borderCOLOR",
  "divideCOLOR",
  "outlineCOLOR",
  "ringCOLOR",
  "ringOffsetCOLOR",
  "fill",
  "strokeCOLOR",
  "placeholderCOLOR",
  "boxShadowCOLOR",
  "bgColour",
  "textDECORATIONCOLOUR",
  "borderCOLOUR",
  "divideCOLOUR",
  "outlineCOLOUR",
  "ringCOLOUR",
  "ringOffsetCOLOUR",
  "placeholderCOLOUR",
  "boxShadowCOLOUR",
] as const;

export type ColorStyle = (typeof COLOR_STYLES)[number];

export const customColors = {
  mywhite: "#fcfcfc",
  myoffwhite: "#e3e3e3",
  mylightgrey: "#a7b1b7",
  myblue: "#293f58",
  mygreen: "#c8df8c",
  myorange: "#f58333",
  mydarkgrey: "#393d34",
  myblack: "#10120d",
  black: "#000000",
  white: "#ffffff",
  "brand-1": "var(--brand-1)",
  "brand-2": "var(--brand-2)",
  "brand-3": "var(--brand-3)",
  "brand-4": "var(--brand-4)",
  "brand-5": "var(--brand-5)",
  "brand-6": "var(--brand-6)",
  "brand-7": "var(--brand-7)",
  "brand-8": "var(--brand-8)",
};

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

export const tailwindToHex = (tailwindColor: string): string => {
  if (tailwindColor.startsWith("bg-brand-")) {
    const brandColor = getBrandColor(`var(--${tailwindColor.slice(3)})`);
    if (brandColor) {
      return brandColor;
    }
  }
  if (tailwindColor.startsWith("brand-")) {
    const brandColor = getBrandColor(`var(--${tailwindColor})`);
    if (brandColor) {
      return `#${brandColor}`;
    }
  }
  if (tailwindColor in customColors) {
    const color = customColors[tailwindColor as keyof typeof customColors];
    if (color.startsWith("var(--")) {
      const brandColor = getBrandColor(color);
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

export const tailwindColors: TailwindColorPalette = {
  slate: [
    "#f8fafc",
    "#f1f5f9",
    "#e2e8f0",
    "#cbd5e1",
    "#94a3b8",
    "#64748b",
    "#475569",
    "#334155",
    "#1e293b",
    "#0f172a",
    "#020617",
  ],
  gray: [
    "#f9fafb",
    "#f3f4f6",
    "#e5e7eb",
    "#d1d5db",
    "#9ca3af",
    "#6b7280",
    "#4b5563",
    "#374151",
    "#1f2937",
    "#111827",
    "#030712",
  ],
  zinc: [
    "#fafafa",
    "#f4f4f5",
    "#e4e4e7",
    "#d4d4d8",
    "#a1a1aa",
    "#71717a",
    "#52525b",
    "#3f3f46",
    "#27272a",
    "#18181b",
    "#09090b",
  ],
  neutral: [
    "#fafafa",
    "#f5f5f5",
    "#e5e5e5",
    "#d4d4d4",
    "#a3a3a3",
    "#737373",
    "#525252",
    "#404040",
    "#262626",
    "#171717",
    "#0a0a0a",
  ],
  stone: [
    "#fafaf9",
    "#f5f5f4",
    "#e7e5e4",
    "#d6d3d1",
    "#a8a29e",
    "#78716c",
    "#57534e",
    "#44403c",
    "#292524",
    "#1c1917",
    "#0c0a09",
  ],
  red: [
    "#fef2f2",
    "#fee2e2",
    "#fecaca",
    "#fca5a5",
    "#f87171",
    "#ef4444",
    "#dc2626",
    "#b91c1c",
    "#991b1b",
    "#7f1d1d",
    "#450a0a",
  ],
  orange: [
    "#fff7ed",
    "#ffedd5",
    "#fed7aa",
    "#fdba74",
    "#fb923c",
    "#f97316",
    "#ea580c",
    "#c2410c",
    "#9a3412",
    "#7c2d12",
    "#431407",
  ],
  amber: [
    "#fffbeb",
    "#fef3c7",
    "#fde68a",
    "#fcd34d",
    "#fbbf24",
    "#f59e0b",
    "#d97706",
    "#b45309",
    "#92400e",
    "#78350f",
    "#451a03",
  ],
  yellow: [
    "#fefce8",
    "#fef9c3",
    "#fef08a",
    "#fde047",
    "#facc15",
    "#eab308",
    "#ca8a04",
    "#a16207",
    "#854d0e",
    "#713f12",
    "#422006",
  ],
  lime: [
    "#f7fee7",
    "#ecfccb",
    "#d9f99d",
    "#bef264",
    "#a3e635",
    "#84cc16",
    "#65a30d",
    "#4d7c0f",
    "#3f6212",
    "#365314",
    "#1a2e05",
  ],
  green: [
    "#f0fdf4",
    "#dcfce7",
    "#bbf7d0",
    "#86efac",
    "#4ade80",
    "#22c55e",
    "#16a34a",
    "#15803d",
    "#166534",
    "#14532d",
    "#052e16",
  ],
  emerald: [
    "#ecfdf5",
    "#d1fae5",
    "#a7f3d0",
    "#6ee7b7",
    "#34d399",
    "#10b981",
    "#059669",
    "#047857",
    "#065f46",
    "#064e3b",
    "#022c22",
  ],
  teal: [
    "#f0fdfa",
    "#ccfbf1",
    "#99f6e4",
    "#5eead4",
    "#2dd4bf",
    "#14b8a6",
    "#0d9488",
    "#0f766e",
    "#115e59",
    "#134e4a",
    "#042f2e",
  ],
  cyan: [
    "#ecfeff",
    "#cffafe",
    "#a5f3fc",
    "#67e8f9",
    "#22d3ee",
    "#06b6d4",
    "#0891b2",
    "#0e7490",
    "#155e75",
    "#164e63",
    "#083344",
  ],
  sky: [
    "#f0f9ff",
    "#e0f2fe",
    "#bae6fd",
    "#7dd3fc",
    "#38bdf8",
    "#0ea5e9",
    "#0284c7",
    "#0369a1",
    "#075985",
    "#0c4a6e",
    "#082f49",
  ],
  blue: [
    "#eff6ff",
    "#dbeafe",
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
    "#1e3a8a",
    "#172554",
  ],
  indigo: [
    "#eef2ff",
    "#e0e7ff",
    "#c7d2fe",
    "#a5b4fc",
    "#818cf8",
    "#6366f1",
    "#4f46e5",
    "#4338ca",
    "#3730a3",
    "#312e81",
    "#1e1b4b",
  ],
  violet: [
    "#f5f3ff",
    "#ede9fe",
    "#ddd6fe",
    "#c4b5fd",
    "#a78bfa",
    "#8b5cf6",
    "#7c3aed",
    "#6d28d9",
    "#5b21b6",
    "#4c1d95",
    "#2e1065",
  ],
  purple: [
    "#faf5ff",
    "#f3e8ff",
    "#e9d5ff",
    "#d8b4fe",
    "#c084fc",
    "#a855f7",
    "#9333ea",
    "#7e22ce",
    "#6b21a8",
    "#581c87",
    "#3b0764",
  ],
  fuchsia: [
    "#fdf4ff",
    "#fae8ff",
    "#f5d0fe",
    "#f0abfc",
    "#e879f9",
    "#d946ef",
    "#c026d3",
    "#a21caf",
    "#86198f",
    "#701a75",
    "#4a044e",
  ],
  pink: [
    "#fdf2f8",
    "#fce7f3",
    "#fbcfe8",
    "#f9a8d4",
    "#f472b6",
    "#ec4899",
    "#db2777",
    "#be185d",
    "#9d174d",
    "#831843",
    "#500724",
  ],
  rose: [
    "#fff1f2",
    "#ffe4e6",
    "#fecdd3",
    "#fda4af",
    "#fb7185",
    "#f43f5e",
    "#e11d48",
    "#be123c",
    "#9f1239",
    "#881337",
    "#4c0519",
  ],
};

export const colorValues = [
  ...Object.keys(customColors),
  "slate-50",
  "slate-100",
  "slate-200",
  "slate-300",
  "slate-400",
  "slate-500",
  "slate-600",
  "slate-700",
  "slate-800",
  "slate-900",
  "slate-950",
  "gray-50",
  "gray-100",
  "gray-200",
  "gray-300",
  "gray-400",
  "gray-500",
  "gray-600",
  "gray-700",
  "gray-800",
  "gray-900",
  "gray-950",
  "zinc-50",
  "zinc-100",
  "zinc-200",
  "zinc-300",
  "zinc-400",
  "zinc-500",
  "zinc-600",
  "zinc-700",
  "zinc-800",
  "zinc-900",
  "zinc-950",
  "neutral-50",
  "neutral-100",
  "neutral-200",
  "neutral-300",
  "neutral-400",
  "neutral-500",
  "neutral-600",
  "neutral-700",
  "neutral-800",
  "neutral-900",
  "neutral-950",
  "stone-50",
  "stone-100",
  "stone-200",
  "stone-300",
  "stone-400",
  "stone-500",
  "stone-600",
  "stone-700",
  "stone-800",
  "stone-900",
  "stone-950",
  "red-50",
  "red-100",
  "red-200",
  "red-300",
  "red-400",
  "red-500",
  "red-600",
  "red-700",
  "red-800",
  "red-900",
  "red-950",
  "orange-50",
  "orange-100",
  "orange-200",
  "orange-300",
  "orange-400",
  "orange-500",
  "orange-600",
  "orange-700",
  "orange-800",
  "orange-900",
  "orange-950",
  "amber-50",
  "amber-100",
  "amber-200",
  "amber-300",
  "amber-400",
  "amber-500",
  "amber-600",
  "amber-700",
  "amber-800",
  "amber-900",
  "amber-950",
  "yellow-50",
  "yellow-100",
  "yellow-200",
  "yellow-300",
  "yellow-400",
  "yellow-500",
  "yellow-600",
  "yellow-700",
  "yellow-800",
  "yellow-900",
  "yellow-950",
  "lime-50",
  "lime-100",
  "lime-200",
  "lime-300",
  "lime-400",
  "lime-500",
  "lime-600",
  "lime-700",
  "lime-800",
  "lime-900",
  "lime-950",
  "green-50",
  "green-100",
  "green-200",
  "green-300",
  "green-400",
  "green-500",
  "green-600",
  "green-700",
  "green-800",
  "green-900",
  "green-950",
  "emerald-50",
  "emerald-100",
  "emerald-200",
  "emerald-300",
  "emerald-400",
  "emerald-500",
  "emerald-600",
  "emerald-700",
  "emerald-800",
  "emerald-900",
  "emerald-950",
  "teal-50",
  "teal-100",
  "teal-200",
  "teal-300",
  "teal-400",
  "teal-500",
  "teal-600",
  "teal-700",
  "teal-800",
  "teal-900",
  "teal-950",
  "cyan-50",
  "cyan-100",
  "cyan-200",
  "cyan-300",
  "cyan-400",
  "cyan-500",
  "cyan-600",
  "cyan-700",
  "cyan-800",
  "cyan-900",
  "cyan-950",
  "sky-50",
  "sky-100",
  "sky-200",
  "sky-300",
  "sky-400",
  "sky-500",
  "sky-600",
  "sky-700",
  "sky-800",
  "sky-900",
  "sky-950",
  "blue-50",
  "blue-100",
  "blue-200",
  "blue-300",
  "blue-400",
  "blue-500",
  "blue-600",
  "blue-700",
  "blue-800",
  "blue-900",
  "blue-950",
  "indigo-50",
  "indigo-100",
  "indigo-200",
  "indigo-300",
  "indigo-400",
  "indigo-500",
  "indigo-600",
  "indigo-700",
  "indigo-800",
  "indigo-900",
  "indigo-950",
  "violet-50",
  "violet-100",
  "violet-200",
  "violet-300",
  "violet-400",
  "violet-500",
  "violet-600",
  "violet-700",
  "violet-800",
  "violet-900",
  "violet-950",
  "purple-50",
  "purple-100",
  "purple-200",
  "purple-300",
  "purple-400",
  "purple-500",
  "purple-600",
  "purple-700",
  "purple-800",
  "purple-900",
  "purple-950",
  "fuchsia-50",
  "fuchsia-100",
  "fuchsia-200",
  "fuchsia-300",
  "fuchsia-400",
  "fuchsia-500",
  "fuchsia-600",
  "fuchsia-700",
  "fuchsia-800",
  "fuchsia-900",
  "fuchsia-950",
  "pink-50",
  "pink-100",
  "pink-200",
  "pink-300",
  "pink-400",
  "pink-500",
  "pink-600",
  "pink-700",
  "pink-800",
  "pink-900",
  "pink-950",
  "rose-50",
  "rose-100",
  "rose-200",
  "rose-300",
  "rose-400",
  "rose-500",
  "rose-600",
  "rose-700",
  "rose-800",
  "rose-900",
  "rose-950",
];
