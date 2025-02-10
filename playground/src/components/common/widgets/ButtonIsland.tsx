/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleActionButtonClick } from "@/utils/common/actionButton";
import type { Config } from "@/types";

interface ButtonIslandProps {
  callbackPayload: any;
  targetUrl: string;
  paneId: string;
  config: Config;
  isVideo: boolean;
  className: string;
  children: React.ReactNode;
}

export const PlayButton = () => {
  return (
    <svg
      viewBox="0 0 459 459"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className="inline-block"
      style={{ height: `1em` }}
    >
      <path
        d="M229.5,0C102.751,0,0,102.751,0,229.5S102.751,459,229.5,459S459,356.249,459,229.5S356.249,0,229.5,0z M310.292,239.651
        l-111.764,76.084c-3.761,2.56-8.63,2.831-12.652,0.704c-4.022-2.128-6.538-6.305-6.538-10.855V153.416
        c0-4.55,2.516-8.727,6.538-10.855c4.022-2.127,8.891-1.857,12.652,0.704l111.764,76.084c3.359,2.287,5.37,6.087,5.37,10.151
        C315.662,233.564,313.652,237.364,310.292,239.651z"
        fill="currentColor"
      />
    </svg>
  );
};

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
      {props.isVideo && (
        <>
          {` `}
          <PlayButton />
        </>
      )}
    </button>
  );
}
