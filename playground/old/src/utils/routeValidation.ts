/**
 * Validates if a given slug path is a valid content route
 * Prevents catching static asset requests or invalid paths
 */
export function isValidContentPath(slug: string | string[] | undefined): boolean {
  if (!slug) return false;

  // Convert slug array to string path
  const path = Array.isArray(slug) ? slug.join("/") : slug;

  // Reject paths with file extensions (static assets)
  if (path.includes(".")) return false;

  // Reject paths starting with special directories
  const invalidPrefixes = [
    "custom/",
    "assets/",
    "static/",
    "public/",
    "api/",
    "_astro/",
    "favicon",
  ];

  if (invalidPrefixes.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  // Reject paths with consecutive slashes or trailing slashes
  if (path.includes("//") || path.endsWith("/")) {
    return false;
  }

  // Optional: Add allowed path patterns
  const validPathPattern = /^[a-zA-Z0-9-_]+(?:\/[a-zA-Z0-9-_]+)*$/;
  return validPathPattern.test(path);
}
