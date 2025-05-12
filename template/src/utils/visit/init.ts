import { pageLoadTime } from "@/store/events";
import { auth, profile, sync, locked, error, success, loading, referrer } from "@/store/auth";
import { syncVisit } from "@/utils/visit/syncVisit.ts";
import { JWT_LIFETIME } from "@/constants";
import { heldBeliefs } from "@/store/beliefs";

export async function init() {
  pageLoadTime.set(Date.now());
  if (locked.get()) {
    return null;
  }

  let reset = false;
  const authPayload = auth.get();
  const lastActive = authPayload?.active ? parseInt(authPayload.active) : 0;
  const mustSync = Date.now() > lastActive + JWT_LIFETIME;

  const hasCredentials = !!authPayload?.encryptedEmail && !!authPayload?.encryptedCode;
  const hasBeliefs = heldBeliefs.get().length > 0;

  if (hasCredentials && !hasBeliefs) {
    try {
      const response = await fetch("/api/turso/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fingerprint: authPayload.key,
          encryptedEmail: authPayload.encryptedEmail,
          encryptedCode: authPayload.encryptedCode,
        }),
      });

      const result = await response.json();
      if (result.success && result.data.beliefs) {
        try {
          const parsedBeliefs = JSON.parse(result.data.beliefs);

          // Add or update KnownLead belief
          const knownLeadIndex = parsedBeliefs.findIndex(
            (b: { slug: string }) => b.slug === "KnownLead"
          );
          if (knownLeadIndex >= 0) {
            parsedBeliefs[knownLeadIndex].verb = "BELIEVES_YES";
          } else {
            parsedBeliefs.push({
              id: "KnownLead",
              slug: "KnownLead",
              verb: "BELIEVES_YES",
            });
          }

          heldBeliefs.set(parsedBeliefs);
        } catch (e) {
          console.error("Error parsing beliefs:", e);
        }
      }
    } catch (e) {
      console.log("Silent belief restoration failed, continuing with regular init");
    }
  } else if (hasCredentials) {
    // User has credentials and may already have beliefs - add KnownLead if not present
    const beliefs = heldBeliefs.get();
    const knownLeadIndex = beliefs.findIndex((b) => b.slug === "KnownLead");
    if (knownLeadIndex >= 0) {
      if (beliefs[knownLeadIndex].verb !== "BELIEVES_YES") {
        beliefs[knownLeadIndex].verb = "BELIEVES_YES";
        heldBeliefs.set(beliefs);
      }
    } else {
      beliefs.push({
        id: "KnownLead",
        slug: "KnownLead",
        verb: "BELIEVES_YES",
      });
      heldBeliefs.set(beliefs);
    }
  }

  if (authPayload?.consent !== "1" && Date.now() > lastActive + JWT_LIFETIME * 5) {
    auth.setKey(`active`, undefined);
    auth.setKey(`key`, undefined);
    auth.setKey(`beliefs`, undefined);
    auth.setKey(`encryptedCode`, undefined);
    auth.setKey(`encryptedEmail`, undefined);
    auth.setKey(`hasProfile`, undefined);
    auth.setKey(`unlockedProfile`, undefined);
    auth.setKey(`key`, undefined);
    reset = true;
  } else if (Date.now() > lastActive + JWT_LIFETIME * 5) {
    auth.setKey(`unlockedProfile`, undefined);
  }

  if (!mustSync && !reset) {
    sync.set(true);
    return null;
  }

  auth.setKey(`active`, Date.now().toString());
  locked.set(true);

  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  const httpReferrer = document.referrer;
  const utmSource = params[`utm_source`] || undefined;
  const utmMedium = params[`utm_medium`] || undefined;
  const utmCampaign = params[`utm_campaign`] || undefined;
  const utmTerm = params[`utm_term`] || undefined;
  const utmContent = params[`utm_content`] || undefined;
  const ref = {
    httpReferrer,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
  };
  referrer.set(ref);

  const conciergeSync = await syncVisit({
    fingerprint: authPayload?.key,
    visitId: authPayload?.visitId,
    encryptedCode: authPayload?.encryptedCode,
    encryptedEmail: authPayload?.encryptedEmail,
    referrer: ref,
  });

  if (conciergeSync?.fingerprint) {
    auth.setKey(`key`, conciergeSync.fingerprint);
  }
  if (conciergeSync?.firstname) {
    profile.set({
      ...profile.get(),
      firstname: conciergeSync.firstname,
    });
  }
  if (conciergeSync?.knownLead) {
    auth.setKey(`consent`, `1`);
  }
  if (conciergeSync?.auth) {
    auth.setKey(`hasProfile`, `1`);
  } else {
    auth.setKey(`hasProfile`, undefined);
    auth.setKey("unlockedProfile", undefined);
  }
  auth.setKey(`active`, Date.now().toString());

  sync.set(true);
  locked.set(false);
  error.set(undefined);
  success.set(undefined);
  loading.set(undefined);
}
