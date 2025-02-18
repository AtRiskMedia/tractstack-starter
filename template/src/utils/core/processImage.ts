import sharp from "sharp";
import path from "path";

interface ProcessedImage {
  width: number;
  buffer: Buffer;
  filename: string;
}

export async function processImage(
  inputBuffer: Buffer,
  filename: string
): Promise<ProcessedImage[]> {
  try {
    const basename = path.basename(filename, path.extname(filename));

    // Process image for each width
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
    console.error("Error processing image:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to process image: ${error.message}`
        : "Failed to process image"
    );
  }
}
