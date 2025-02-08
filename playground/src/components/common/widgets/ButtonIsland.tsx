/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleActionButtonClick } from "@/utils/common/actionButton";
import type { Config } from "@/types";

interface ButtonIslandProps {
  callbackPayload: any;
  targetUrl: string;
  paneId: string;
  config: Config;
  className: string;
  children: React.ReactNode;
}

export function ButtonIsland(props: ButtonIslandProps) {
  return (
    <button
      className={props.className}
      onClick={(e) => {
        e.preventDefault();
        handleActionButtonClick(props);
      }}
    >
      {props.children}
    </button>
  );
}
