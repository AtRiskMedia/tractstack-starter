import { memo } from "react";
import { dragHandleStore } from "@/store/storykeep.ts";
import { toolAddModeDefaultHeight } from "@/constants.ts";

export const GhostBlock = memo(() => {
  const height = `${dragHandleStore.get().ghostHeight}px` || `${toolAddModeDefaultHeight}px`;
  return <div style={{ height }} className={`w-full bg-blue-200`} />;
});
