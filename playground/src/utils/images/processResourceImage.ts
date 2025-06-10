import { ulid } from "ulid";
import imageCompression from "browser-image-compression";

const TARGET_WIDTHS = [1080, 600, 400];

export async function processResourceImage(
  file: File,
  resourceId: string,
  resourceTitle: string
): Promise<{ success: boolean; fileId: string; path: string }> {
  const fileId = ulid();
  const monthPath = new Date().toISOString().slice(0, 7);
  const uploadedPaths: string[] = [];

  try {
    // Handle SVG files
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      const svgContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const filename = `${fileId}.svg`;
      const response = await fetch("/api/fs/saveResourceImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/images/resources/${monthPath}`,
          filename,
          data: svgContent,
        }),
      });

      if (!response.ok) throw new Error("Failed to save SVG");
      const { path } = await response.json();
      uploadedPaths.push(path);

      // Create file entry in database
      const fileResponse = await fetch("/api/turso/upsertFileNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fileId,
          nodeType: "File",
          parentId: null,
          filename: filename,
          altDescription: resourceTitle,
          src: path,
        }),
      });

      if (!fileResponse.ok) throw new Error("Failed to save file metadata");

      // Link file to resource
      const linkResponse = await fetch("/api/turso/upsertResourceFile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          resourceId,
          filename,
          altDescription: resourceTitle,
          src: path,
          srcSet: undefined, // SVGs don't have srcSet
        }),
      });

      if (!linkResponse.ok) throw new Error("Failed to link file to resource");

      return { success: true, fileId, path };
    }

    // Handle other image types - compress first
    const options = {
      maxSizeMB: 1,
      useWebWorker: true,
      initialQuality: 0.8,
      alwaysKeepResolution: true,
      fileType: "image/webp" as const,
    };

    const compressedFile = await imageCompression(file, options);

    // Process multiple sizes
    const processedImages = await Promise.all(
      TARGET_WIDTHS.map(async (width) => {
        const resized = await resizeImage(compressedFile, width);
        const filename = `${fileId}_${width}px.webp`;

        const response = await fetch("/api/fs/saveResourceImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: `/images/resources/${monthPath}`,
            filename,
            data: resized,
          }),
        });

        if (!response.ok) throw new Error(`Failed to save ${width}px image`);
        const { path } = await response.json();
        uploadedPaths.push(path);
        return { width, path };
      })
    );

    const mainImagePath = processedImages.find((img) => img.width === 1080)?.path;
    if (!mainImagePath) throw new Error("Failed to generate main image");

    const srcSet = processedImages.map(({ path, width }) => `${path} ${width}w`).join(", ");

    // Create file entry in database
    const fileResponse = await fetch("/api/turso/upsertFileNode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: fileId,
        nodeType: "File",
        parentId: null,
        filename: `${fileId}.webp`,
        altDescription: resourceTitle,
        src: mainImagePath,
        srcSet,
      }),
    });

    if (!fileResponse.ok) throw new Error("Failed to save file metadata");

    // Link file to resource
    const linkResponse = await fetch("/api/turso/upsertResourceFile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId,
        resourceId,
        filename: `${fileId}.webp`,
        altDescription: resourceTitle,
        src: mainImagePath,
        srcSet,
      }),
    });

    if (!linkResponse.ok) throw new Error("Failed to link file to resource");

    return { success: true, fileId, path: mainImagePath };
  } catch (error) {
    console.error("Error processing resource image:", error);

    // Cleanup uploaded files on error
    if (uploadedPaths.length > 0) {
      console.log("Cleaning up uploaded files after error:", uploadedPaths);
      // Note: You may want to add an API endpoint to delete these files
      // For now, just log them
    }

    throw error;
  }
}

async function resizeImage(file: File, targetWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const scaleFactor = targetWidth / img.width;
      canvas.width = targetWidth;
      canvas.height = img.height * scaleFactor;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/webp",
        0.8
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
