import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { paneInit, paneCodeHook } from "../../store/storykeep";
import type { ToolMode, ViewportKey } from "../../types";

const CodeHookWrapper = (props: { id: string; toolMode: ToolMode; viewportKey: ViewportKey }) => {
  const { id, toolMode /* viewportKey */ } = props;
  const [isClient, setIsClient] = useState(false);
  const $paneInit = useStore(paneInit, { keys: [id] });
  const $paneCodeHook = useStore(paneCodeHook, { keys: [id] });
  const slug = $paneCodeHook[id].current?.target || id;

  useEffect(() => {
    if ($paneInit[id]?.init) {
      setIsClient(true);
    }
  }, [id, $paneInit]);

  if (!isClient) return null;

  return (
    <div style={{ position: "relative" }}>
      <div className="w-full text-center text-xl font-myblue font-bold bg-mygreen/20">
        Code Hook: {slug}
      </div>
      {toolMode !== "text" && <div className="absolute inset-0 w-full h-full z-50" />}
    </div>
  );
};

export default CodeHookWrapper;
