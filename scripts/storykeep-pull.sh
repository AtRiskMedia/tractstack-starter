#!/bin/bash

# Get script directory and resolve paths cleanly
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." &>/dev/null && pwd)
STORYKEEP_PATH=${STORYKEEP_PATH:-"$(cd "$PROJECT_ROOT/../tractstack-storykeep" &>/dev/null && pwd)"}
TEMPLATE_DIR="./template"

# ANSI color codes
blue='\033[0;34m'
brightblue='\033[1;34m'
white='\033[1;37m'
green='\033[0;32m'
red='\033[0;31m'
yellow='\033[0;33m'
reset='\033[0m'

# Print banner
echo -e "${brightblue}"
echo -e "${brightblue}  _                ${blue}  _       _             _     "
echo -e "${brightblue} | |_ _ __ __ _  ___| |_ ${blue}___| |_ __ _  ___| | __ "
echo -e "${brightblue} | __| \__/ _\` |/ __| __/ ${blue}__| __/ _\` |/ __| |/ / "
echo -e "${brightblue} | |_| | | (_| | (__| |_${blue}\__ \ || (_| | (__|   <  "
echo -e "${brightblue}  \__|_|  \__,_|\___|\__|${blue}___/\__\__,_|\___|_|\_\ "
echo -e ""
echo -e "${reset}no-code website builder and content marketing platform"
echo -e "${white}by At Risk Media"
echo -e "${reset}"

# Validate Story Keep path exists and contains astro.config.mjs
if [ ! -d "$STORYKEEP_PATH" ]; then
  echo -e "${red}Error: Story Keep directory not found at $STORYKEEP_PATH${reset}"
  echo "Set STORYKEEP_PATH environment variable to specify a different location"
  exit 1
fi

if [ ! -f "$STORYKEEP_PATH/astro.config.mjs" ]; then
  echo -e "${red}Error: No astro.config.mjs found in $STORYKEEP_PATH${reset}"
  echo "Are you sure this is a valid Story Keep installation?"
  exit 1
fi

# Update starter template
echo -e "${blue}Updating Tract Stack starter template...${reset}"
cd "$PROJECT_ROOT"
git pull
if [ $? -ne 0 ]; then
  echo -e "${red}Error: Failed to update starter template${reset}"
  exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Copy files selectively
echo -e "${blue}Updating Story Keep installation...${reset}"

# Function to copy directory contents while preserving specific paths
copy_directory() {
  local src="$1"
  local dest="$2"
  local preserve=("$3")

  # Create destination if it doesn't exist
  mkdir -p "$dest"

  # Copy files and directories
  for item in "$src"/*; do
    if [ -e "$item" ]; then
      base_name=$(basename "$item")

      # Skip preserved directories
      if [[ " ${preserve[@]} " =~ " ${base_name} " ]]; then
        echo -e "${yellow}Preserving $dest/$base_name${reset}"
        continue
      fi

      if [ -d "$item" ]; then
        # Recursively copy directory
        copy_directory "$item" "$dest/$base_name" "${preserve[@]}"
      else
        # Copy file
        cp -f "$item" "$dest/$base_name"
        echo -e "${green}Updated $dest/$base_name${reset}"
      fi
    fi
  done
}

# Copy src directory
echo -e "${blue}Updating src directory...${reset}"
copy_directory "$TEMPLATE_DIR/src" "$STORYKEEP_PATH/src" "custom"

# Copy public directory (preserving custom and styles)
echo -e "${blue}Updating public directory...${reset}"
copy_directory "$TEMPLATE_DIR/public" "$STORYKEEP_PATH/public" "custom styles"

# Copy root configuration files
echo -e "${blue}Updating configuration files...${reset}"
cp -f "$TEMPLATE_DIR/astro.config.mjs" "$STORYKEEP_PATH/"
cp -f "$TEMPLATE_DIR/tailwind.config.cjs" "$STORYKEEP_PATH/"
cp -f "$TEMPLATE_DIR/tsconfig.json" "$STORYKEEP_PATH/"
cp -f "$TEMPLATE_DIR/env.d.ts" "$STORYKEEP_PATH/"
cp -f "$TEMPLATE_DIR"/.prettierrc* "$STORYKEEP_PATH/"

# Update package.json while preserving local dependencies
if [ -f "$STORYKEEP_PATH/package.json" ]; then
  echo -e "${blue}Updating package.json...${reset}"
  # Try to merge only if both files exist and are valid JSON
  if [ -f "$TEMPLATE_DIR/package.json" ] && [ -f "$STORYKEEP_PATH/package.json" ]; then
    if jq '.' "$TEMPLATE_DIR/package.json" >/dev/null 2>&1 &&
      jq '.' "$STORYKEEP_PATH/package.json" >/dev/null 2>&1; then
      echo -e "\n${blue}Attempting to merge package.json files...${reset}"
      if jq -s '.[0] * .[1] | del(.scripts.prepare) | del(.devDependencies.husky)' \
        "$TEMPLATE_DIR/package.json" "$STORYKEEP_PATH/package.json" >"$TEMP_DIR/package.json"; then
        mv "$TEMP_DIR/package.json" "$STORYKEEP_PATH/package.json"
        echo -e "${green}Successfully updated package.json${reset}"
      else
        echo -e "${red}Error: Failed to merge package.json files${reset}"
      fi
    else
      echo -e "${red}Error: One or both package.json files contain invalid JSON${reset}"
    fi
  else
    echo -e "${yellow}Warning: One or both package.json files not found, skipping update${reset}"
  fi
fi

echo -e "${green}Story Keep update complete!${reset}"
echo -e "${blue}Please review changes and run ~/scripts/build.sh to update${reset}"
