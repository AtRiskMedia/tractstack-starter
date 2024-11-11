import type { AstroGlobal } from "astro";

export async function isAuthenticated(Astro: AstroGlobal): Promise<boolean> {
  const token = Astro.cookies.get("storykeep_auth_token")?.value;
  return token === "authenticated";
}

export async function isOpenDemoMode(Astro: AstroGlobal): Promise<boolean> {
  const token = Astro.cookies.get("storykeep_auth_token")?.value;
  return token === "open_demo";
}

export function setAuthenticated(Astro: AstroGlobal, value: boolean, isOpenDemo: boolean = false) {
  if (value) {
    const tokenValue = isOpenDemo ? "open_demo" : "authenticated";
    Astro.cookies.set("storykeep_auth_token", tokenValue, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  } else {
    Astro.cookies.delete("storykeep_auth_token", { path: "/" });
  }
}
