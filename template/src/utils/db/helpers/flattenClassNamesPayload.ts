import { convertToString } from "../../common/helpers";
import type { ClassNamesPayload, FlattenedClasses } from "../../../types";

interface DefaultClassNamesPayload {
  [key: string]: {
    mobile: FlattenedClasses;
    tablet: FlattenedClasses;
    desktop: FlattenedClasses;
  };
}

type ParentClassNamesPayload = {
  mobile: FlattenedClasses;
  tablet: FlattenedClasses;
  desktop: FlattenedClasses;
}[];

const isEmptyObject = (obj: Record<string, unknown>) => {
  return Object.keys(obj).length === 0;
};

export function flattenClassNamesPayload(payload: ClassNamesPayload): {
  defaultClasses: DefaultClassNamesPayload;
  parentClasses: ParentClassNamesPayload;
} {
  const defaultClasses: DefaultClassNamesPayload = {};
  const parentClasses: ParentClassNamesPayload = [];

  const createResponsiveClasses = () => ({
    mobile: {} as FlattenedClasses,
    tablet: {} as FlattenedClasses,
    desktop: {} as FlattenedClasses,
  });

  const populateResponsiveClasses = (classObj: Record<string, unknown>) => {
    // If the input classObj is empty, return null
    if (isEmptyObject(classObj)) return null;

    const responsiveClasses = createResponsiveClasses();

    Object.entries(classObj).forEach(([prop, tupleArray]) => {
      if (Array.isArray(tupleArray)) {
        if (tupleArray[0] !== undefined) {
          responsiveClasses.mobile[prop] = convertToString(tupleArray[0]);
        }
        if (tupleArray[1] !== undefined && tupleArray[1] !== tupleArray[0]) {
          responsiveClasses.tablet[prop] = convertToString(tupleArray[1]);
        }
        if (tupleArray[2] !== undefined && tupleArray[2] !== tupleArray[1]) {
          responsiveClasses.desktop[prop] = convertToString(tupleArray[2]);
        }
      }
    });

    return responsiveClasses;
  };

  Object.entries(payload).forEach(([elementType, value]) => {
    if (!value?.classes || [`button`, `hover`].includes(elementType)) return;

    if (elementType === "parent") {
      const classesArray = Array.isArray(value.classes) ? value.classes : [value.classes];
      // Filter out any empty objects before processing
      const nonEmptyResults = classesArray
        .map((classObj) => (!isEmptyObject(classObj) ? populateResponsiveClasses(classObj) : null))
        .filter((result): result is NonNullable<typeof result> => result !== null);

      if (nonEmptyResults.length > 0) {
        parentClasses.push(...nonEmptyResults);
      }
    } else {
      const classesObj = Array.isArray(value.classes) ? value.classes[0] : value.classes;
      const responsiveClasses = populateResponsiveClasses(classesObj);
      if (responsiveClasses) {
        defaultClasses[elementType] = responsiveClasses;
      }
    }
  });

  return { defaultClasses, parentClasses };
}
