import { lispLexer } from "@/utils/concierge/lispLexer";
import { preParseAction } from "@/utils/concierge/preParse_Action";
import { preParseImpression } from "@/utils/concierge/preParse_Impression";
import { current, events } from "@/store/events";
import type { ImpressionDatum, Config } from "@/types";

export const Impression = ({
  payload,
  slug,
  isContext,
  config,
}: {
  payload: ImpressionDatum;
  slug: string;
  isContext: boolean;
  config: Config;
}) => {
  const thisButtonPayload = lispLexer(payload.actionsLisp);
  const actionPayload = preParseAction(thisButtonPayload, slug, isContext, config);
  const event = preParseImpression(
    payload.id,
    payload.title,
    current.get().id,
    thisButtonPayload,
    config
  );
  const pushEvent = function (): void {
    if (event) events.set([...events.get(), event]);
  };

  if (typeof payload !== `object`) return <div className="hidden" />;
  return (
    <div className="p-3">
      <h3 className="text-md font-action leading-6 text-black">{payload.title}</h3>
      <div className="mt-2 xs:flex xs:items-start xs:justify-between">
        <div className="max-w-xl text-sm text-black">
          <p>
            {payload.body}
            {` `}
            <a
              onClick={() => pushEvent()}
              className="underline underline-offset-4 text-black hover:text-myorange"
              href={actionPayload}
            >
              {payload.buttonText}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Impression;
