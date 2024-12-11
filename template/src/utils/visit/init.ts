import { events, current, pageLoadTime } from "../../store/events";
import {
  auth,
  profile,
  sync,
  locked,
  entered,
  error,
  success,
  loading,
  referrer,
} from "../../store/auth";
import { syncVisit } from "./syncVisit.ts";
import { JWT_LIFETIME } from "../../constants";

export async function init() {
  pageLoadTime.set(Date.now());
  if (locked.get()) {
    return null;
  }

  let reset = false;
  const authPayload = auth.get();
  const lastActive = authPayload?.active ? parseInt(authPayload.active) : 0;
  const mustSync = Date.now() > lastActive + JWT_LIFETIME;

  // delete any session storage after > 1 hr if no consent provided
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
    //window.location.reload();
  } else if (Date.now() > lastActive + JWT_LIFETIME * 5) {
    // if consent provided; lock profile after > 1 hr
    auth.setKey(`unlockedProfile`, undefined);
  }

  // register page view
  const cur = current.get();
  if (cur.id && cur.slug && cur.title && cur.parentId) {
    const pageViewEvent = {
      id: cur.id,
      parentId: cur.parentId,
      type: `StoryFragment`,
      verb: `PAGEVIEWED`,
    };
    events.set([...events.get(), pageViewEvent]);
  }

  // flag on first visit from external
  if (!entered.get()) {
    entered.set(true);
    const ref = document.referrer;
    const internal = ref !== `` && ref.indexOf(location.protocol + "//" + location.host) === 0;
    if (!internal && ref && cur?.id && cur?.parentId) {
      const enteredEvent = {
        id: cur.id,
        parentId: cur.parentId,
        type: `StoryFragment`,
        verb: `ENTERED`,
      };
      events.set([...events.get(), enteredEvent]);
    }
  }

  // sync once; unless soon inactive
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

  // unlock; set sync
  sync.set(true);
  locked.set(false);
  error.set(undefined);
  success.set(undefined);
  loading.set(undefined);
}
