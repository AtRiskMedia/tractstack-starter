import { useEffect } from "react";
import { contentMap } from "../../../store/events";
import type { ContentMap } from "../../../types";

const SetContentMap = (props: { payload: ContentMap[] }) => {
  const { payload } = props;

  useEffect(() => {
    contentMap.set(payload);
  }, []);

  return <div />;
};

export default SetContentMap;
