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
  "config",
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
const EXCLUDED_PATHS = [
  "public/images",
  "public/custom",
  "config/init.json",
  "config/turso.json",
  "public/styles/frontend.css",
];

// Empty files to create
const EMPTY_FILES = ["config/init.json", "config/turso.json", "public/styles/frontend.css"];

// Empty directories to create (with .gitkeep files)
const EMPTY_DIRECTORIES = ["public/images/og", "public/images/thumbs", "public/custom"];

async function shouldCopyFile(srcPath: string): Promise<boolean> {
  const relativePath = path.relative(PLAYGROUND_DIR, srcPath);
  return !EXCLUDED_PATHS.some(
    (excludedPath) => relativePath.startsWith(excludedPath) || relativePath === excludedPath
  );
}

async function copyWithExclusions(src: string, dest: string) {
  await fs.copy(src, dest, { filter: (srcPath: string) => shouldCopyFile(srcPath) });
}

async function createStorykeepFile() {
  const timestamp = Math.floor(Date.now() / 1000);
  const storykeepData = { storykeep: timestamp };
  const outputPath = path.join(ROOT_DIR, "storykeep.json");
  await fs.writeJson(outputPath, storykeepData, { spaces: 2 });
}

async function createEmptyFiles() {
  for (const file of EMPTY_FILES) {
    const filePath = path.join(TEMPLATE_DIR, file);
    await fs.ensureDir(path.dirname(filePath));
    const content = file.endsWith(".json") ? "{}" : "";
    await fs.writeFile(filePath, content);
  }
}

async function createEmptyDirectoriesWithGitKeep() {
  for (const dir of EMPTY_DIRECTORIES) {
    const dirPath = path.join(TEMPLATE_DIR, dir);
    await fs.ensureDir(dirPath);
    await fs.writeFile(path.join(dirPath, ".gitkeep"), "");
  }
}

async function prepareTemplate() {
  try {
    // Verify directories
    if (!fs.existsSync(PLAYGROUND_DIR)) {
      throw new Error("Playground directory not found");
    }

    // Clean/create template directory
    await fs.emptyDir(TEMPLATE_DIR);

    // Copy core files
    for (const file of CORE_FILES) {
      const src = path.join(PLAYGROUND_DIR, file);
      const dest = path.join(TEMPLATE_DIR, file);
      if (fs.existsSync(src)) {
        if (file === "public" || file === "config") {
          await copyWithExclusions(src, dest);
        } else {
          await fs.copy(src, dest);
        }
      } else {
        console.warn(`Warning: ${file} not found in playground`);
      }
    }

    // Create empty files and directories with .gitkeep
    await createEmptyFiles();
    await createEmptyDirectoriesWithGitKeep();

    // Set version based on current time
    await createStorykeepFile();

    // Copy and modify package.json
    const packageJson = await fs.readJson(path.join(PLAYGROUND_DIR, "package.json"));
    delete packageJson.scripts?.prepare;
    delete packageJson.devDependencies?.husky;
    await fs.writeJson(path.join(TEMPLATE_DIR, "package.json"), packageJson, { spaces: 2 });

    // Copy .env.template to .env
    await fs.copy(path.join(PLAYGROUND_DIR, ".env.template"), path.join(TEMPLATE_DIR, ".env"));

    console.log("Template prepared");
  } catch (error) {
    console.error("Error preparing template:", error);
    process.exit(1);
  }
}

prepareTemplate();
