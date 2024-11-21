export interface SetupChecks {
  hasConcierge: boolean;
  hasTurso: boolean;
  hasBranding: boolean;
  hasContent: boolean;
  hasAssemblyAI: boolean;
}

export function getSetupChecks(): SetupChecks {
  const hasTurso = [import.meta.env.TURSO_DATABASE_URL, import.meta.env.TURSO_AUTH_TOKEN].every(
    (x) =>
      typeof x === "string" &&
      x.trim().length > 0 &&
      (x.startsWith("libsql://") || x.startsWith("ey"))
  );

  // PRIVATE_ not available on client and we need to run this check on client
  const hasConcierge = [
    import.meta.env.PUBLIC_CONCIERGE_STYLES_URL,
    //import.meta.env.PRIVATE_CONCIERGE_BASE_URL,
    import.meta.env.PUBLIC_IMAGE_URL,
    //import.meta.env.PRIVATE_CONCIERGE_SECRET,
    //import.meta.env.PRIVATE_AUTH_SECRET,
  ].every((x) => typeof x === "string" && x.trim().length > 0);

  const hasBranding = [
    import.meta.env.PUBLIC_THEME,
    import.meta.env.PUBLIC_FOOTER,
    import.meta.env.PUBLIC_SLOGAN,
    import.meta.env.PUBLIC_SITE_URL,
  ].every((x) => typeof x === "string" && x.trim().length > 0);

  const hasContent = [import.meta.env.PUBLIC_HOME, import.meta.env.PUBLIC_TRACTSTACK].every(
    (x) => typeof x === "string" && x.trim().length > 0
  );

  const hasAssemblyAI = [import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY].every(
    (x) => typeof x === "string" && x.trim().length > 0
  );

  return {
    hasConcierge,
    hasTurso,
    hasBranding,
    hasContent,
    hasAssemblyAI,
  };
}
