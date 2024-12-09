import { tailwindClasses, tailwindCoreLayoutClasses } from "../../assets/tailwindClasses";
import type {
  TupleValue,
  ClassNamesPayloadDatum,
  ClassNamesPayloadDatumValue,
  OptionsPayloadDatum,
  Tuple,
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

const processParentClasses = (
  parentClasses: ClassNamesPayloadDatum["parent"]["classes"]
): [string[], string[], string[], string[]] => {
  if (!parentClasses) {
    return [[], [], [], []];
  }
  const processClassObject = (classObj: ClassNamesPayloadDatumValue) => {
    return processClassesForViewports(classObj, {});
  };
  let all: string[] = [];
  let mobile: string[] = [];
  let tablet: string[] = [];
  let desktop: string[] = [];
  if (Array.isArray(parentClasses)) {
    const result = parentClasses.map((classObj) => processClassObject(classObj));
    all = result.map((r) => r[0]).flat();
    mobile = result.map((r) => r[1]).flat();
    tablet = result.map((r) => r[2]).flat();
    desktop = result.map((r) => r[3]).flat();
  }
  return [all, mobile, tablet, desktop];
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

const processTupleForViewport = (tuple: Tuple, viewportIndex: number): TupleValue => {
  if (tuple.length === 1) return tuple[0];
  if (tuple.length === 2) return viewportIndex === 0 ? tuple[0] : tuple[1];
  return tuple[viewportIndex] ?? tuple[2] ?? tuple[1] ?? tuple[0];
};

const processClassesForViewports = (
  classes: ClassNamesPayloadDatumValue,
  // | ClassNamesPayloadValue,
  override: {
    [key: string]: (Tuple | null)[];
  },
  count: number = 1
): [string[], string[], string[], string[]] => {
  const processForViewport = (viewportIndex: number): string[] => {
    return Array(count)
      .fill(null)
      .map((_, i) =>
        Object.entries(classes)
          .map(([selector, tuple]) => {
            const overrideTuple = override?.[selector]?.[i];
            const value = overrideTuple
              ? processTupleForViewport(overrideTuple, viewportIndex)
              : processTupleForViewport(tuple, viewportIndex);
            return reduceClassName(selector, value, -1);
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
      if (!mobileClasses.includes(cls)) combinedClasses.add(`md:${cls}`);
    });

    desktopClasses.forEach((cls) => {
      if (!mobileClasses.includes(cls) && !tabletClasses.includes(cls)) {
        combinedClasses.add(`xl:${cls}`);
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

export const reduceClassNamesPayload = (optionsPayload: OptionsPayloadDatum) => {
  const { classNamesPayload: classes } = optionsPayload;
  optionsPayload.classNames = { all: {}, mobile: {}, tablet: {}, desktop: {} };

  Object.entries(classes).forEach(([elementName, elementClasses]) => {
    if (elementName === "parent" || elementName === "modal") return;

    const { classes: allSelectors, count = 1, override } = elementClasses;
    if (!allSelectors) return;
    // this should never be []; that's only in modal or parent
    if (!Array.isArray(allSelectors)) {
      const [all, mobile, tablet, desktop] = processClassesForViewports(
        allSelectors,
        override || {},
        count
      );
      optionsPayload.classNames = {
        ...optionsPayload?.classNames,
        all: {
          ...optionsPayload?.classNames?.all,
          [elementName]: all,
        },
        desktop: {
          ...optionsPayload?.classNames?.desktop,
          [elementName]: desktop,
        },
        tablet: {
          ...optionsPayload?.classNames?.tablet,
          [elementName]: tablet,
        },
        mobile: {
          ...optionsPayload?.classNames?.mobile,
          [elementName]: mobile,
        },
      };
    }
  });

  // Process parent classes
  if (classes.parent && classes.parent.classes) {
    const parentClasses = classes.parent.classes;
    const [all, mobile, tablet, desktop] = processParentClasses(parentClasses);
    optionsPayload.classNamesParent = {
      all,
      mobile,
      tablet,
      desktop,
    };
  } else {
    optionsPayload.classNamesParent = {
      all: [""],
      mobile: [""],
      tablet: [""],
      desktop: [""],
    };
  }

  // Process modal classes
  if (classes.modal && classes.modal.classes) {
    const modalClasses = classes.modal.classes;
    const [all, mobile, tablet, desktop] = processClassesForViewports(
      modalClasses as ClassNamesPayloadDatumValue,
      {}
    );
    // we direct inline these classes to the modal, so no []
    optionsPayload.classNamesModal = {
      all: all[0] || "",
      mobile: mobile[0] || "",
      tablet: tablet[0] || "",
      desktop: desktop[0] || "",
    };
  }

  // Process button classes
  if (optionsPayload.buttons) {
    for (const buttonKey in optionsPayload.buttons) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const buttonData = (optionsPayload.buttons as any)[buttonKey];
      const buttonClasses = buttonData.classNamesPayload?.button?.classes;
      const buttonHoverClasses = buttonData.classNamesPayload?.hover?.classes;

      if (buttonClasses) {
        const [allButton, mobileButton, tabletButton, desktopButton] = processClassesForViewports(
          buttonClasses,
          {}
        );

        let [allHover, mobileHover, tabletHover, desktopHover] = [[], [], [], []] as [
          string[],
          string[],
          string[],
          string[],
        ];
        if (buttonHoverClasses) {
          [allHover, mobileHover, tabletHover, desktopHover] = processClassesForViewports(
            buttonHoverClasses,
            {}
          );
        }

        const combineClasses = (regular: string[], hover: string[]) => {
          return regular.map((cls, index) => {
            const hoverCls = hover[index]
              ? hover[index]
                  .split(" ")
                  .map((c) => `hover:${c}`)
                  .join(" ")
              : "";
            return `${cls} ${hoverCls}`.trim();
          });
        };

        buttonData.className = combineClasses(allButton, allHover)[0] || "";
        buttonData.mobileClassName = combineClasses(mobileButton, mobileHover)[0] || "";
        buttonData.tabletClassName = combineClasses(tabletButton, tabletHover)[0] || "";
        buttonData.desktopClassName = combineClasses(desktopButton, desktopHover)[0] || "";

        // Remove the separate hoverClassName properties
        delete buttonData.hoverClassName;
        delete buttonData.mobileHoverClassName;
        delete buttonData.tabletHoverClassName;
        delete buttonData.desktopHoverClassName;
      }
    }
  }

  return optionsPayload;
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
