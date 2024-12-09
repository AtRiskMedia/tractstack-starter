import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import BoltIcon from "@heroicons/react/24/outline/BoltIcon";
import BoltSlashIcon from "@heroicons/react/24/outline/BoltSlashIcon";
import { auth } from "../../../store/auth";
import { heldBeliefs } from "../../../store/beliefs";

export const RememberMe = () => {
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState(false);
  const $authPayload = useStore(auth);
  const $heldBeliefsAll = useStore(heldBeliefs);

  useEffect(() => {
    if ($authPayload.consent === `1`) setConsent(true);
    else if (consent) setConsent(false);
    if ($heldBeliefsAll.length) setActive(true);
  }, [$heldBeliefsAll, $authPayload]);

  if (!import.meta.env.PROD || (!active && !consent)) return null;
  if (!consent)
    return (
      <a
        href="/concierge/profile"
        className="hover:text-myblue hover:rotate-6"
        title="Session and Profile options"
      >
        <BoltSlashIcon className="h-6 w-6" title="Remember your Session" />
      </a>
    );
  return (
    <a
      href="/concierge/profile"
      className="hover:text-myblue hover:rotate-6"
      title="Session and Profile options"
    >
      <BoltIcon className="h-6 w-6 text-myblue/80" title="Configure your Session" />
    </a>
  );
};
