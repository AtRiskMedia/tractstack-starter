import { useEffect } from "react";
import { contentMap, codehookMap } from "@/store/events.ts";
import { brandColours, preferredTheme } from "@/store/storykeep.ts";
import type { Theme, FullContentMap } from "@/types.ts";

const SetMap = (props: {
  payload: FullContentMap[];
  availableCodeHooks: string[];
  brand: string;
  theme: Theme;
}) => {
  const { payload, availableCodeHooks, brand, theme } = props;

  useEffect(() => {
    contentMap.set(payload);
    codehookMap.set(availableCodeHooks);
    brandColours.set(brand);
    preferredTheme.set(theme);
  }, []);

  return <div />;
};

export default SetMap;
