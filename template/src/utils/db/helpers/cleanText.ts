export function cleanText(text: string): string {
  const cleanText = text
    // Basic mojibake fixes
    .replace(/\u00A0/g, " ") // Replace non-breaking space with regular space
    .replace(/Â/g, "") // Remove standalone Â characters
    .replace(/â€œ/g, '"') // Fix opening smart quote mojibake
    .replace(/â€/g, '"') // Fix closing smart quote mojibake
    .replace(/â€˜/g, "'") // Fix opening single smart quote mojibake
    .replace(/â€™/g, "'") // Fix closing single smart quote mojibake
    .replace(/â€"/g, "—") // Fix em dash mojibake
    .replace(/â€"/g, "–") // Fix en dash mojibake
    .replace(/â€¦/g, "...") // Fix ellipsis mojibake

    // Smart quotes and related characters
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes with straight quote
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes with straight quotes
    .replace(/[\u2013\u2014]/g, "-") // Replace en/em dashes with hyphen
    .replace(/\u2026/g, "...") // Replace ellipsis character with three dots

    // Common HTML entities that might appear unencoded
    .replace(/&ldquo;|&rdquo;/g, '"') // HTML quote entities
    .replace(/&lsquo;|&rsquo;/g, "'") // HTML single quote entities
    .replace(/&quot;/g, '"') // HTML basic quote entity
    .replace(/&amp;/g, "&") // HTML ampersand entity
    .replace(/&lt;/g, "<") // HTML less than entity
    .replace(/&gt;/g, ">") // HTML greater than entity
    .replace(/&nbsp;/g, " ") // HTML non-breaking space entity
    .replace(/&mdash;/g, "—") // HTML em dash entity
    .replace(/&ndash;/g, "–") // HTML en dash entity

    // Other common encoding issues
    .replace(/â„¢/g, "™") // Fix trademark mojibake
    .replace(/Ã¢â‚¬â„¢/g, "'") // Fix nested single quote mojibake
    .replace(/Ã¢â‚¬Å"/g, '"') // Fix nested double quote mojibake
    .replace(/Ã¢â‚¬â€/g, '"') // Fix another nested quote variant
    .replace(/Ã©/g, "é") // Fix common é mojibake
    .replace(/Ã¨/g, "è") // Fix common è mojibake
    .replace(/Ã/g, "à") // Fix common à mojibake
    .replace(/Ã¤/g, "ä") // Fix common ä mojibake
    .replace(/Ã¶/g, "ö") // Fix common ö mojibake
    .replace(/Ã¼/g, "ü") // Fix common ü mojibake
    .replace(/Ã±/g, "ñ") // Fix common ñ mojibake

    // Control and zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces and joiners

    // Multiple spaces and whitespace
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace

  if (cleanText) return cleanText;
  return ` `;
}
