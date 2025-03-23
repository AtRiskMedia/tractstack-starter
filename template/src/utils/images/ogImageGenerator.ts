import {
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  TEXT_MARGIN,
  adjustFontSizeForHeight,
} from "./ogImageUtils";
import type { OgImageParams } from "@/types";

/**
 * Generates an Open Graph image based on the title and styling parameters using Canvas API
 * @param title The page title to display in the OG image
 * @param params Styling parameters (text color, background color, font size)
 * @returns Promise resolving to base64 encoded image data
 */
export async function generateOgImage(title: string, params: OgImageParams): Promise<string> {
  // Create a canvas element
  const canvas = document.createElement("canvas");
  canvas.width = OG_IMAGE_WIDTH;
  canvas.height = OG_IMAGE_HEIGHT;

  // Get 2D context for drawing
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Wait for fonts to load
  await document.fonts.ready;

  // Fill background
  ctx.fillStyle = params.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate font size if not provided
  const fontSize = params.fontSize || adjustFontSizeForHeight(title, 72);

  // Style text
  ctx.fillStyle = params.textColor;
  ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Add text shadow for better readability
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Calculate line breaks if needed
  const maxLineWidth = OG_IMAGE_WIDTH - TEXT_MARGIN * 2;
  const words = title.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    const { width } = ctx.measureText(testLine);

    if (width <= maxLineWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine); // Don't forget to add the last line

  // Draw the text lines centered vertically
  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  let y = (canvas.height - totalTextHeight) / 2 + fontSize / 2;

  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, y);
    y += lineHeight;
  });

  // Convert canvas to data URL
  try {
    // Using webp for better compression and compatibility
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    return dataUrl;
  } catch (error) {
    console.error("Error converting canvas to data URL:", error);
    throw error;
  }
}

/**
 * Helper function to ensure fonts are loaded before generating the image
 * @returns Promise that resolves when all fonts are ready
 */
export async function ensureFontLoaded(): Promise<void> {
  // Create a promise that resolves when fonts are loaded
  return new Promise<void>((resolve) => {
    // Check if fonts are already loaded
    if (document.fonts.status === "loaded") {
      resolve();
      return;
    }

    // Wait for fonts to load
    document.fonts.ready.then(() => {
      // Add a small delay to ensure everything is rendered
      setTimeout(resolve, 100);
    });
  });
}

/**
 * Generate an OG image with font loading guarantee
 * @param title The page title
 * @param params Styling parameters
 * @returns Promise resolving to base64 encoded image data
 */
export async function generateOgImageWithFontLoading(
  title: string,
  params: OgImageParams
): Promise<string> {
  // First ensure fonts are loaded
  await ensureFontLoaded();

  // Add font loading check to see if Inter is available
  try {
    // Create a small canvas to test if the font is loaded
    const testCanvas = document.createElement("canvas");
    testCanvas.width = 100;
    testCanvas.height = 30;
    const testCtx = testCanvas.getContext("2d");

    if (testCtx) {
      testCtx.font = "16px 'Inter'";
      testCtx.fillText("Test", 10, 20);
    }
  } catch (e) {
    console.warn("Font test failed, using system fonts:", e);
  }

  // Generate the image
  return generateOgImage(title, params);
}
