import fs from "fs-extra";
import path from "path";

// Get the monorepo root directory by looking for pnpm-workspace.yaml
function findRootDir() {
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error("Could not find monorepo root (pnpm-workspace.yaml)");
}

const ROOT_DIR = findRootDir();
const PLAYGROUND_DIR = path.join(ROOT_DIR, "playground");
const TEMPLATE_DIR = path.join(ROOT_DIR, "template");

// Files/directories to copy from playground to template
const CORE_FILES = [
  "src",
  "public",
  ".prettierrc",
  ".prettierignore",
  "astro.config.mjs",
  "tailwind.config.cjs",
  "tsconfig.json",
  "README.md",
  "LICENSE.md",
  "Dockerfile.example",
];

// Paths to exclude from copying
const EXCLUDED_PATHS = ["public/images", "config/init.json"];

async function copyWithExclusions(src: string, dest: string) {
  const filter = (srcPath: string) => {
    const relativePath = path.relative(PLAYGROUND_DIR, srcPath);
    return !EXCLUDED_PATHS.some(
      (excludedPath) => relativePath.startsWith(excludedPath) || relativePath === excludedPath
    );
  };

  await fs.copy(src, dest, { filter });
}

async function prepareTemplate() {
  try {
    console.log("Root directory:", ROOT_DIR);
    console.log("Playground directory:", PLAYGROUND_DIR);
    console.log("Template directory:", TEMPLATE_DIR);

    // Verify directories
    if (!fs.existsSync(PLAYGROUND_DIR)) {
      throw new Error("Playground directory not found");
    }

    // Clean/create template directory
    console.log("Cleaning template directory...");
    await fs.emptyDir(TEMPLATE_DIR);

    // Copy core files
    console.log("Copying core files...");
    for (const file of CORE_FILES) {
      const src = path.join(PLAYGROUND_DIR, file);
      const dest = path.join(TEMPLATE_DIR, file);

      if (fs.existsSync(src)) {
        if (file === "public") {
          // Use custom copy function with exclusions for public directory
          await copyWithExclusions(src, dest);
        } else {
          await fs.copy(src, dest);
        }
        console.log(`Copied ${file}`);
      } else {
        console.warn(`Warning: ${file} not found in playground directory`);
      }
    }

    // Copy app.css to frontend.css
    console.log("Copying app.css to frontend.css...");
    const stylesSrc = path.join(PLAYGROUND_DIR, "public", "styles", "app.css");
    const stylesDest = path.join(TEMPLATE_DIR, "public", "styles", "frontend.css");

    // Ensure the destination directory exists
    await fs.ensureDir(path.dirname(stylesDest));

    if (fs.existsSync(stylesSrc)) {
      await fs.copy(stylesSrc, stylesDest);
      console.log("Copied app.css to frontend.css");
    } else {
      console.warn("Warning: app.css not found in playground directory");
    }

    // Copy and modify package.json
    console.log("Processing package.json...");
    const packageJson = await fs.readJson(path.join(PLAYGROUND_DIR, "package.json"));

    // Remove husky-related content
    delete packageJson.scripts.prepare;
    delete packageJson.devDependencies?.husky;

    await fs.writeJson(path.join(TEMPLATE_DIR, "package.json"), packageJson, { spaces: 2 });
    console.log("Processed package.json");

    // Copy .env.template to .env
    console.log("Setting up environment file...");
    await fs.copy(path.join(PLAYGROUND_DIR, ".env.template"), path.join(TEMPLATE_DIR, ".env"));
    console.log("Set up environment file");

    console.log("Template preparation completed successfully!");
  } catch (error) {
    console.error("Error preparing template:", error);
    process.exit(1);
  }
}

prepareTemplate();
