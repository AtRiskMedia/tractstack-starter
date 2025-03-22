import sharp from "sharp";
import path from "path";
import type { APIContext } from "astro";

interface ProcessedImage {
  width: number;
  buffer: Buffer;
  filename: string;
}

export async function processImage(
  inputBuffer: Buffer,
  filename: string,
  context: APIContext
): Promise<ProcessedImage[]> {
  const tenantId = context.locals.tenant?.id || "default";

  try {
    const basename = path.basename(filename, path.extname(filename));
    const processed = await Promise.all(
      [1200, 600, 300].map(async (width) => {
        const buffer = await sharp(inputBuffer)
          .resize(width, null, {
            fit: "contain",
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();
        return {
          width,
          buffer,
          filename: `${basename}_${width}px.webp`,
        };
      })
    );
    return processed;
  } catch (error) {
    console.error(`Error processing image for tenant ${tenantId}:`, error);
    throw new Error(
      error instanceof Error
        ? `Failed to process image: ${error.message}`
        : "Failed to process image"
    );
  }
}
