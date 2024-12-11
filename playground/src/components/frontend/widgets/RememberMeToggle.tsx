import { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";
import { useStore } from "@nanostores/react";
import { classNames } from "../../../utils/common/helpers";
import { auth } from "../../../store/auth";
import { heldBeliefs } from "../../../store/beliefs";

export const RememberMeToggle = () => {
  const [consent, setConsent] = useState(false);
  const $authPayload = useStore(auth);

  function toggleConsent() {
    if (consent) {
      // Clear all auth-related localStorage items
      localStorage.removeItem("auth:beliefs");
      localStorage.removeItem("auth:encryptedCode");
      localStorage.removeItem("auth:encryptedEmail");
      localStorage.removeItem("auth:hasProfile");
      localStorage.removeItem("auth:unlockedProfile");
      localStorage.removeItem("auth:key");
      localStorage.removeItem("auth:consent");
      localStorage.removeItem("auth:active");
      localStorage.removeItem("auth:visitId");
      localStorage.removeItem("auth:knownCorpusIds");
      
      // Clear user beliefs
      localStorage.removeItem("user");
      heldBeliefs.set([]);
      
      // Clear the store values
      auth.setKey("beliefs", undefined);
      auth.setKey("encryptedCode", undefined);
      auth.setKey("encryptedEmail", undefined);
      auth.setKey("hasProfile", undefined);
      auth.setKey("unlockedProfile", undefined);
      auth.setKey("key", undefined);
      auth.setKey("consent", undefined);
      auth.setKey("active", undefined);
      auth.setKey("visitId", undefined);
      auth.setKey("knownCorpusIds", undefined);

      // Reload page to resync with new fingerprint
      window.location.reload();
    } else {
      auth.setKey("consent", "1");
    }
    setConsent(!consent);
  }

  useEffect(() => {
    if ($authPayload.consent === "1") setConsent(true);
  }, [$authPayload]);

  return (
    <Switch.Group as="div" className={classNames("flex items-center my-6")}>
      <Switch
        checked={consent}
        onChange={() => toggleConsent()}
        className={classNames(
          consent ? "bg-myorange" : "bg-myblue",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            consent ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-lg">
        <div className="flex flex-nowrap">
          <span className={consent ? "text-myorange" : "text-mydarkgrey"}>
            {consent ? "Memory activated!" : "Activate memory"}
          </span>
        </div>
      </Switch.Label>
    </Switch.Group>
  );
};

export default RememberMeToggle;
