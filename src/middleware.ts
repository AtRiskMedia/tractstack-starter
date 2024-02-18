import { defineMiddleware } from "astro/middleware";
import { parse } from "@kavach/cookie";
import {
  TOKEN,
  REFRESHTOKEN,
  CONCIERGE_AUTH,
  CONCIERGE_SYNC_INTERVAL,
} from "./constant";

import { auth } from "./store/auth.ts";
import { events, lastRun, contentMap } from "./store/events.ts";
import { processEvents } from "./utils/processEvents.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  const opts = { path: `/` };
  const eventStream = events.get();
  const lastRunValue = lastRun.get(`lastRun`);
  const contentMapValue = contentMap.get();
  console.log(contentMapValue);
  const hasJwt = auth.get()[TOKEN];
  if (!hasJwt) {
    const res = await fetch(CONCIERGE_AUTH);
    const data = await res.json();
    const rawCookie = res.headers.get("set-cookie");
    if (typeof rawCookie === `string`) {
      const cookie: any = parse(rawCookie);
      const jwt = data.jwt;
      const refreshToken = cookie.refreshToken;
      context.cookies.set(REFRESHTOKEN, refreshToken, opts);
      auth.setKey(TOKEN, jwt);
    }
  }
  if (
    eventStream.length &&
    Date.now() > lastRunValue + CONCIERGE_SYNC_INTERVAL
  ) {
    const result = processEvents(eventStream);
    console.log(`events processed`, result);
    lastRun.set(Date.now());
    events.set([]);
  }
  return next();
});
