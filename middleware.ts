import { defineMiddleware } from "astro/middleware";
import { parse } from "@kavach/cookie";
import { TOKEN, REFRESHTOKEN, CONCIERGE_AUTH } from "./constant";

export const onRequest = defineMiddleware(async (context, next) => {
  console.log(`sync start`);
  const opts = { path: `/` };
  if (!context.cookies.get(REFRESHTOKEN) && !context.cookies.get(TOKEN)) {
    const res = await fetch(CONCIERGE_AUTH);
    const data = await res.json();
    const rawCookie = res.headers.get("set-cookie");
    if (typeof rawCookie === `string`) {
      const cookie: any = parse(rawCookie);
      const jwt = data.jwt;
      const refreshToken = cookie.refreshToken;
      context.cookies.set(REFRESHTOKEN, refreshToken, opts);
      context.cookies.set(TOKEN, jwt, opts);
    }
  }
  context.locals.sync = `yes`;
  console.log(`sync end`);
  return next();
});
