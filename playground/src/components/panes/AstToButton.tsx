import { preParseClicked } from "../../utils/concierge/preParseClicked";
import { preParseBunny } from "../../utils/concierge/preParseBunny";
import { events } from "../../store/events";

export const PlayButton = ({ className = "" }) => {
  return (
    <svg
      className={`inline-block h-[1em] w-auto ${className}`}
      viewBox="0 0 459 459"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
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

/* eslint-disable @typescript-eslint/no-explicit-any */
export function AstToButton({
  text,
  className,
  callbackPayload,
  targetUrl,
  paneId,
  slug,
}: {
  text: string;
  className: string;
  callbackPayload: any;
  targetUrl: string;
  paneId: string;
  slug: string;
}) {
  const bunny = preParseBunny(callbackPayload);
  const event = preParseClicked(paneId, callbackPayload);
  const pushEvent = function (): void {
    if (bunny) {
      const videoContainer = document.getElementById("video-container");
      if (videoContainer) {
        videoContainer.scrollIntoView({ behavior: "smooth" });
        // Dispatch custom event to update video start time
        const event = new CustomEvent("updateVideo", {
          detail: { startTime: `${bunny.t}s` },
        });
        document.dispatchEvent(event);
      }
      if (event) events.set([...events.get(), event]);
    }
  };
  // if this is a bunny video event, check if same page
  if (bunny && bunny.slug === slug) {
    return (
      <button className={className} onClick={() => pushEvent()} title={targetUrl}>
        <span className="px-2">
          {text}
          {` `}
          <PlayButton />
        </span>
      </button>
    );
  }
  return (
    <a
      type="button"
      className={className}
      onClick={() => pushEvent()}
      href={targetUrl}
      title={targetUrl}
    >
      {text}
    </a>
  );
}
