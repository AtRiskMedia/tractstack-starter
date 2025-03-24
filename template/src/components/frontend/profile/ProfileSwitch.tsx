import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { success, loading, error, auth, profile } from "@/store/auth";
import { ProfileCreate } from "./ProfileCreate";
import { ProfileEdit } from "./ProfileEdit";
import { ProfileUnlock } from "./ProfileUnlock";

async function restoreProfile() {
  const authData = auth.get();
  if (authData.encryptedEmail && authData.encryptedCode) {
    try {
      const response = await fetch("/api/turso/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprint: authData.key,
          encryptedEmail: authData.encryptedEmail,
          encryptedCode: authData.encryptedCode,
        }),
      });
      const result = await response.json();
      if (result.success) {
        profile.set({
          firstname: result.data.firstname,
          contactPersona: result.data.contactPersona,
          email: result.data.email,
          shortBio: result.data.shortBio,
        });
        auth.setKey("unlockedProfile", "1");
        auth.setKey("hasProfile", "1");
        return true;
      }
    } catch (e) {
      console.error("Failed to restore profile:", e);
    }
  }
  return false;
}

export const ProfileSwitch = () => {
  const $authPayload = useStore(auth);
  const $profile = useStore(profile);
  const [mode, setMode] = useState(`unset`);

  useEffect(() => {
    const init = async () => {
      // If we have encrypted credentials but no profile data, try to restore
      if ($authPayload?.encryptedCode && $authPayload?.encryptedEmail && !$profile.firstname) {
        const restored = await restoreProfile();
        if (restored) {
          setMode("edit");
          return;
        }
      }

      // Otherwise determine which mode to show
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
      } else if ($authPayload?.unlockedProfile && $profile.firstname) {
        error.set(undefined);
        success.set(undefined);
        loading.set(undefined);
        setMode(`edit`);
      }
    };

    init();
  }, [
    $authPayload.encryptedCode,
    $authPayload.encryptedEmail,
    $authPayload.hasProfile,
    $authPayload.consent,
    $authPayload.unlockedProfile,
    $profile.firstname,
  ]);

  if (mode === `unset`) return <div />;
  if (mode === `edit` && !$profile.firstname) return <div />;

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
