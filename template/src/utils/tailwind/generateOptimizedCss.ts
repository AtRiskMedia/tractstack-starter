import fs from 'fs/promises';
import path from 'path';

interface CssLookup {
  [className: string]: {
    properties: Record<string, string>;
    media: Record<string, Record<string, string>>;
  };
}

export async function generateOptimizedCss(whitelistedClasses: string[]): Promise<void> {
  try {
    console.log('Processing whitelist:', whitelistedClasses);

    const lookupPath = path.join(process.cwd(), 'config', 'tailwindLookup.json');
    const lookupContent = await fs.readFile(lookupPath, 'utf-8');
    const cssLookup: CssLookup = JSON.parse(lookupContent);

    let css = '';
    const mediaQueries: Record<string, string[]> = {};

    // Process each class
    whitelistedClasses.forEach(className => {
      const escapedClass = className.replace(/[/:]/g, '\\$&');
      const lookup = cssLookup[className] || cssLookup[escapedClass];

      if (!lookup) {
        console.log(`Missing lookup for class: ${className}`);
        return;
      }

      // Add base properties
      if (Object.keys(lookup.properties).length > 0) {
        css += `.${escapedClass}{${Object.entries(lookup.properties)
          .map(([prop, value]) => `${prop}:${value}`)
          .join(';')}}\n`;
      }

      // Collect media queries
      if (lookup.media) {
        Object.entries(lookup.media).forEach(([query, properties]) => {
          // Ensure we're not adding '@media' twice by checking if it's already in the query
          const cleanedQuery = query.startsWith('@media') ? query : `@media ${query}`;
          if (!mediaQueries[cleanedQuery]) {
            mediaQueries[cleanedQuery] = [];
          }
          mediaQueries[cleanedQuery].push(
            `.${escapedClass}{${Object.entries(properties)
              .map(([prop, value]) => `${prop}:${value}`)
              .join(';')}}`
          );
        });
      }
    });

    // Add media queries
    Object.entries(mediaQueries).forEach(([query, styles]) => {
      css += `${query}{${styles.join('')}}\n`;
    });

    if (!css) {
      console.log('No CSS generated!');
      return;
    }

    const outputPath = path.join(process.cwd(), 'public', 'styles', 'frontend.css');
    await fs.writeFile(outputPath, css);
    console.log(`CSS written to ${outputPath}`);

  } catch (error) {
    console.error('Error in generateOptimizedCss:', error);
    throw error;
  }
}
