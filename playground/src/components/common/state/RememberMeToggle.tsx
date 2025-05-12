import { useEffect, useState } from "react";
import { Switch } from "@ark-ui/react";
import { useStore } from "@nanostores/react";
import { classNames } from "@/utils/common/helpers";
import { auth } from "@/store/auth";
import { heldBeliefs } from "@/store/beliefs";

export const RememberMeToggle = () => {
  const [consent, setConsent] = useState(false);
  const $authPayload = useStore(auth);

  function toggleConsent(checked: boolean) {
    if (checked !== consent) {
      if (checked) {
        auth.setKey("consent", "1");
      } else {
        localStorage.removeItem("auth:beliefs");
        localStorage.removeItem("auth:encryptedCode");
        localStorage.removeItem("auth:encryptedEmail");
        localStorage.removeItem("auth:hasProfile");
        localStorage.removeItem("auth:unlockedProfile");
        localStorage.removeItem("auth:key");
        localStorage.removeItem("auth:consent");
        localStorage.removeItem("auth:active");
        localStorage.removeItem("auth:visitId");
        localStorage.removeItem("user");
        heldBeliefs.set([]);

        auth.setKey("beliefs", undefined);
        auth.setKey("encryptedCode", undefined);
        auth.setKey("encryptedEmail", undefined);
        auth.setKey("hasProfile", undefined);
        auth.setKey("unlockedProfile", undefined);
        auth.setKey("key", undefined);
        auth.setKey("consent", undefined);
        auth.setKey("active", undefined);
        auth.setKey("visitId", undefined);

        window.location.reload();
      }
      setConsent(checked);
    }
  }

  useEffect(() => {
    if ($authPayload.consent === "1") setConsent(true);
  }, [$authPayload]);

  return (
    <div className={classNames("flex items-center my-6")}>
      <Switch.Root
        checked={consent}
        onCheckedChange={(details) => toggleConsent(details.checked)}
        className="inline-flex items-center"
      >
        <Switch.Control
          className={classNames(
            consent ? "bg-myorange" : "bg-myblue",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-myorange focus:ring-offset-2"
          )}
        >
          <Switch.Thumb
            className={classNames(
              consent ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out"
            )}
          />
        </Switch.Control>
        <Switch.HiddenInput />
        <div className="flex items-center h-6 ml-3">
          <Switch.Label className="text-lg">
            <div className="flex flex-nowrap">
              <span className={consent ? "text-myorange" : "text-mydarkgrey"}>
                {consent ? "Memory activated!" : "Activate memory"}
              </span>
            </div>
          </Switch.Label>
        </div>
      </Switch.Root>
    </div>
  );
};

export default RememberMeToggle;
