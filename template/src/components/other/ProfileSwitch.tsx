import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { success, loading, error, auth } from "../../store/auth";
import { ProfileCreate } from "./ProfileCreate";
import { ProfileEdit } from "./ProfileEdit";
import { ProfileUnlock } from "./ProfileUnlock";

export const ProfileSwitch = () => {
  const $authPayload = useStore(auth);
  const [mode, setMode] = useState(`unset`);

  useEffect(() => {
    if (
      ($authPayload?.encryptedCode &&
        $authPayload?.encryptedEmail &&
        !$authPayload?.unlockedProfile) ||
      ($authPayload?.hasProfile && !$authPayload?.unlockedProfile)
    ) {
      error.set(undefined);
      success.set(undefined);
      loading.set(undefined);
      setMode(`unlock`);
    } else if ($authPayload.consent === `1` && !$authPayload.hasProfile) {
      error.set(undefined);
      success.set(undefined);
      loading.set(undefined);
      setMode(`create`);
    } else if ($authPayload?.unlockedProfile) {
      error.set(undefined);
      success.set(undefined);
      loading.set(undefined);
      setMode(`edit`);
    }
  }, [
    $authPayload.encryptedCode,
    $authPayload.encryptedEmail,
    $authPayload.hasProfile,
    $authPayload.consent,
    $authPayload.unlockedProfile,
  ]);

  if (mode === `unset`) return <div />;
  return (
    <div className="py-12">
      <div className="bg-mywhite border border-dashed border-myblue/20">
        <div className="p-6">
          {mode === `create` ? (
            <ProfileCreate />
          ) : mode === `unlock` ? (
            <ProfileUnlock />
          ) : mode === `edit` ? (
            <ProfileEdit />
          ) : null}
        </div>
      </div>
    </div>
  );
};
