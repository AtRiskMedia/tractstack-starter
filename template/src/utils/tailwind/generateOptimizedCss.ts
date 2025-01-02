//import fs from "fs/promises";
//import path from "path";

//interface CssLookup {
//  [className: string]: {
//    properties: Record<string, string>;
//    media: Record<string, Record<string, string>>;
//  };
//}

//function escapeSelector(selector: string): string {
//  // Handle different cases:
//  // 1. Classes with dots (mt-2.5)
//  // 2. Pseudo-classes (hover:)
//  // 3. Media query prefixes (md:)
//  const parts = selector.split(":");
//  const baseClass = parts[0].replace(/\./g, "\\.");
//  const pseudoClasses = parts.slice(1);
//
//  // For hover classes, we need to escape both parts
//  if (selector.startsWith("hover:")) {
//    return `hover\\:${parts[1]}:hover`;
//  }
//
//  // For other pseudo-classes
//  const pseudoClass = pseudoClasses.join(":");
//  return pseudoClass ? `${baseClass}:${pseudoClass}` : baseClass;
//}
//
//function getLookupKey(className: string): string {
//  // For hover classes, append :hover to match the lookup format
//  if (className.startsWith("hover:")) {
//    return `${className}:hover`;
//  }
//  return className;
//}

//export async function generateOptimizedCss(whitelistedClasses: string[]): Promise<void> {
//  console.log(`generateOptimizedCss should not be running`);
//try {
//  const lookupPath = path.join(process.cwd(), "config", "tailwindLookup.json");
//  const lookupContent = await fs.readFile(lookupPath, "utf-8");
//  const cssLookup: CssLookup = JSON.parse(lookupContent);

//  let css = "";
//  const mediaQueries: Record<string, string[]> = {};

//  // Process each class
//  whitelistedClasses.forEach((className) => {
//    const lookupKey = getLookupKey(className);
//    const escapedClass = escapeSelector(className);
//    const lookup = cssLookup[lookupKey];

//    if (!lookup) {
//      console.log(`Missing lookup for class: ${className} (lookup key: ${lookupKey})`);
//      return;
//    }

//    // Add base properties
//    if (Object.keys(lookup.properties).length > 0) {
//      css += `.${escapedClass}{${Object.entries(lookup.properties)
//        .map(([prop, value]) => `${prop}:${value}`)
//        .join(";")}}\n`;
//    }

//    // Collect media queries
//    if (lookup.media) {
//      Object.entries(lookup.media).forEach(([query, properties]) => {
//        const cleanedQuery = query.startsWith("@media") ? query : `@media ${query}`;
//        if (!mediaQueries[cleanedQuery]) {
//          mediaQueries[cleanedQuery] = [];
//        }
//        mediaQueries[cleanedQuery].push(
//          `.${escapedClass.replace(/(md|xs|xl):/, "$1\\:")}{${Object.entries(properties)
//            .map(([prop, value]) => `${prop}:${value}`)
//            .join(";")}} `
//        );
//      });
//    }
//  });

//  // Add media queries
//  Object.entries(mediaQueries).forEach(([query, styles]) => {
//    css += `${query}{${styles.join("")}}\n`;
//  });

//  if (!css) {
//    console.log("No CSS generated!");
//    return;
//  }

//  const outputPath = path.join(process.cwd(), "public", "styles", "frontend.css");
//  await fs.writeFile(outputPath, css);
//} catch (error) {
//  console.error("Error in generateOptimizedCss:", error);
//  throw error;
//}
//}
