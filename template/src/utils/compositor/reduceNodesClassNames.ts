import { tailwindClasses, tailwindCoreLayoutClasses } from "../tailwind/tailwindClasses";
import type { TupleValue, ViewportKey } from "../../types";

const tailwindModifier = ["", "md:", "xl:"];
const tailwindCoreModifier = ["xs:", "md:", "xl:"];

const stripViewportPrefixes = (classes: string[]): string[] => {
  return classes.map((classStr) =>
    classStr
      .split(" ")
      .map((cls) => cls.replace(/^(xs:|md:|xl:)/, ""))
      .join(" ")
  );
};

const mergeWithCascade = (
  baseStyles: Partial<Record<ViewportKey, Record<string, string>>>,
  overrideStyles: Partial<Record<ViewportKey, Record<string, string>>>,
  viewport: ViewportKey
): Record<string, string> => {
  // Skip 'auto' viewport as it's handled elsewhere
  if (viewport === 'auto') {
    return {};
  }

  const viewportOrder: ViewportKey[] = ["mobile", "tablet", "desktop"];
  const viewportIndex = viewportOrder.indexOf(viewport);
  let result: Record<string, string> = {};

  // First, cascade the base styles
  for (let i = 0; i <= viewportIndex; i++) {
    const currentViewport = viewportOrder[i];
    if (baseStyles[currentViewport]) {
      result = { ...result, ...baseStyles[currentViewport] };
    }
  }

  // Then, cascade the override styles
  for (let i = 0; i <= viewportIndex; i++) {
    const currentViewport = viewportOrder[i];
    if (overrideStyles[currentViewport]) {
      result = { ...result, ...overrideStyles[currentViewport] };
    }
  }

  return result;
};

const reduceClassName = (selector: string, v: TupleValue, viewportIndex: number): string => {
  if (!selector) return "";
  const modifier =
    viewportIndex === -1
      ? tailwindCoreLayoutClasses.includes(selector)
        ? tailwindCoreModifier[0]
        : ""
      : tailwindModifier[viewportIndex];
  const { className, prefix, useKeyAsClass } = getTailwindClassInfo(selector);
  const thisSelector = useKeyAsClass ? selector : className;
  const applyPrefix = (value: string) => {
    return value.startsWith(prefix) ? value : `${prefix}${value}`;
  };

  if (typeof v === "boolean")
    console.log(`DEPRECATED STYLE FOUND in classNamesPayload`, selector, v, viewportIndex);
  if (v === false || v === null || v === undefined) return "";
  if (typeof v === "boolean") return `${modifier}${applyPrefix(v ? thisSelector : "")}`;
  if (v === "true") return `${modifier}${applyPrefix(thisSelector)}`;
  if (typeof v === "string" && v[0] === "!")
    return `${modifier}-${applyPrefix(`${thisSelector}-${v.substring(1)}`)}`;
  if ((typeof v === "string" || typeof v === "number") && selector === "animate")
    return `motion-safe:${modifier}${applyPrefix(`${thisSelector}-${v}`)}`;
  if (useKeyAsClass && typeof v === "string") return `${modifier}${applyPrefix(v)}`;
  if (typeof v === "string" || typeof v === "number") {
    if (typeof v === "string" && v.startsWith("-")) {
      return `${modifier}-${applyPrefix(`${thisSelector}${v}`)}`;
    }
    return `${modifier}${applyPrefix(`${thisSelector}-${v}`)}`;
  }

  return "";
};

export const processClassesForViewports = (
  classes: {
    mobile: Record<string, string>;
    tablet: Record<string, string>;
    desktop: Record<string, string>;
  },
  override: {
    mobile?: Record<string, string>;
    tablet?: Record<string, string>;
    desktop?: Record<string, string>;
  },
  count: number = 1
): [string[], string[], string[], string[]] => {
  const processForViewport = (viewport: ViewportKey): string[] => {
    console.log(`must apply viewport to parentClasses to regen parentCss`)
    const results: string[] = [];
    //const viewportOrder: ViewportKey[] = ["mobile", "tablet", "desktop"];
    //const viewportIndex = viewportOrder.indexOf(viewport);

    for (let i = 0; i < count; i++) {
      // Get cascaded styles for this viewport
      const cascadedStyles = mergeWithCascade(
        classes,
        override as Record<ViewportKey, Record<string, string>>,
        viewport
      );

      const classesForViewport: string[] = [];
      for (const [selector, value] of Object.entries(cascadedStyles)) {
        classesForViewport.push(reduceClassName(selector, value, -1));
      }

      results.push(classesForViewport.length > 0 ? classesForViewport.join(" ") : " ");
    }
    return results;
  };

  const mobile = processForViewport("mobile");
  const tablet = processForViewport("tablet");
  const desktop = processForViewport("desktop");

  // Generate the 'all' classes with proper viewport prefixes
  const all = mobile.map((_, index) => {
    const mobileClasses = mobile[index].split(" ");
    const tabletClasses = tablet[index].split(" ");
    const desktopClasses = desktop[index].split(" ");

    const combinedClasses = new Set(mobileClasses);

    tabletClasses.forEach((cls) => {
      const baseClass = cls.replace(/(xs:|md:|xl:)/g, "");
      if (cls.length > 0 && !mobileClasses.includes(baseClass)) {
        combinedClasses.add(`md:${baseClass}`);
      }
    });

    desktopClasses.forEach((cls) => {
      const baseClass = cls.replace(/(xs:|md:|xl:)/g, "");
      if (
        cls.length > 0 &&
        !mobileClasses.includes(baseClass) &&
        !tabletClasses.includes(baseClass)
      ) {
        combinedClasses.add(`xl:${baseClass}`);
      }
    });

    return Array.from(combinedClasses).join(" ");
  });
  return [
    all,
    stripViewportPrefixes(mobile),
    stripViewportPrefixes(tablet),
    stripViewportPrefixes(desktop),
  ];
};

function getTailwindClassInfo(selector: string): {
  className: string;
  prefix: string;
  values: string[] | "number";
  useKeyAsClass?: boolean;
} {
  const classInfo = tailwindClasses[selector];
  if (!classInfo) {
    return { className: selector, prefix: "", values: [] };
  }

  return {
    className: classInfo.className,
    prefix: classInfo.prefix,
    values: classInfo.values,
    useKeyAsClass: classInfo.useKeyAsClass,
  };
}
