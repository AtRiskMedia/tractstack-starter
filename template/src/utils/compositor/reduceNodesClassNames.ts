import { tailwindClasses, tailwindCoreLayoutClasses } from "../tailwind/tailwindClasses";
import type {
  TupleValue,
} from "../../types";

const tailwindModifier = [``, `md:`, `xl:`];
const tailwindCoreModifier = [`xs:`, `md:`, `xl:`];

const stripViewportPrefixes = (classes: string[]): string[] => {
  return classes.map((classStr) =>
    classStr
      .split(" ")
      .map((cls) => cls.replace(/^(xs:|md:|xl:)/, ""))
      .join(" ")
  );
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
    // If the value already starts with the prefix, don't add it again
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
    // Handle negative values
    if (typeof v === "string" && v.startsWith("-")) {
      return `${modifier}-${applyPrefix(`${thisSelector}${v}`)}`;
    }
    return `${modifier}${applyPrefix(`${thisSelector}-${v}`)}`;
  }

  return "";
};
export const processClassesForViewports = (
  classes: Record<string, string>,
  // | ClassNamesPayloadValue,
  override: Record<string, string>,
  count: number = 1
): [string[], string[], string[], string[]] => {
  const processForViewport = (viewportIndex: number): string[] => {
    return Array(count)
      .fill(null)
      .map((_, i) =>
        Object.entries(classes)
          .map(([selector, value]) => {
            const overrideValue = override?.[selector]?.[i];
            if(overrideValue) {
              return reduceClassName(selector, overrideValue, -1);
            } else {
              return reduceClassName(selector, value, -1);
            }
          })
          .filter(Boolean)
          .join(" ")
      );
  };
  const mobile = processForViewport(0);
  const tablet = processForViewport(1);
  const desktop = processForViewport(2);
  const all = mobile.map((_, index) => {
    const mobileClasses = mobile[index].split(" ");
    const tabletClasses = tablet[index].split(" ");
    const desktopClasses = desktop[index].split(" ");
    const combinedClasses = new Set(mobileClasses);
    tabletClasses.forEach((cls) => {
      if (!mobileClasses.includes(cls.replace(/(xs:|md:|xl:)/g, "")))
        combinedClasses.add(`md:${cls.replace(/(xs:|md:|xl:)/g, "")}`);
    });
    desktopClasses.forEach((cls) => {
      if (
        !mobileClasses.includes(cls.replace(/(xs:|md:|xl:)/g, "")) &&
        !tabletClasses.includes(cls.replace(/(xs:|md:|xl:)/g, ""))
      ) {
        combinedClasses.add(`xl:${cls.replace(/(xs:|md:|xl:)/g, "")}`);
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
