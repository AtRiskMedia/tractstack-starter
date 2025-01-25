import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import { brandColours } from "@/store/storykeep.ts";
import type { FullContentMap } from "@/types.ts";

const SetMap = (props: {
  payload: FullContentMap[];
  availableCodeHooks: string[];
  brand: string;
}) => {
  const { payload, availableCodeHooks, brand } = props;

  useEffect(() => {
    contentMap.set(payload);
    codehookMap.set(availableCodeHooks);
    brandColours.set(brand);
  }, []);

  return <div />;
};

export default SetMap;
