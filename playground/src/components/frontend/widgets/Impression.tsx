import { lispLexer } from "../../../utils/concierge/lispLexer";
import { preParseAction } from "../../../utils/concierge/preParseAction";
import { preParseImpression } from "../../../utils/concierge/preParseImpression";
import { current, events } from "../../../store/events";
import type { ImpressionDatum } from "../../../types";

export const Impression = ({
  payload,
  slug,
  isContext,
}: {
  payload: ImpressionDatum;
  slug: string;
  isContext: boolean;
}) => {
  const thisButtonPayload = lispLexer(payload.actionsLisp);
  const actionPayload = preParseAction(thisButtonPayload, slug, isContext);
  const event = preParseImpression(payload.id, payload.title, current.get().id, thisButtonPayload);
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
