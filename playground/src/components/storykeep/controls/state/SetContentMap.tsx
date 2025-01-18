import { useEffect } from "react";
import { contentMap } from "@/store/events.ts";
import type { FullContentMap } from "@/types.ts";

const SetContentMap = (props: { payload: FullContentMap[] }) => {
  const { payload } = props;

  useEffect(() => {
    contentMap.set(payload);
  }, []);

  return <div />;
};

export default SetContentMap;
