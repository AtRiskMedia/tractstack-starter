import type { APIContext, AppLocals } from "@/types";
import type { AstroGlobal } from "astro";

export function getAPIContext(astro: AstroGlobal): APIContext {
  // Cast the locals to match our AppLocals type
  const locals = astro.locals as unknown as AppLocals;

  return {
    locals,
    request: astro.request,
    params: astro.params,
    url: astro.url,
    redirect: astro.redirect,
  } as APIContext;
}
