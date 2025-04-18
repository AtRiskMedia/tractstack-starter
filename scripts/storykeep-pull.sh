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
echo -e "    ███        ▄████████    ▄████████  ▄████████     ███    "
echo -e "▀█████████▄   ███    ███   ███    ███ ███    ███ ▀█████████▄"
echo -e "   ▀███▀▀██   ███    ███   ███    ███ ███    █▀     ▀███▀▀██"
echo -e "    ███   ▀  ▄███▄▄▄▄██▀   ███    ███ ███            ███   ▀"
echo -e "    ███     ▀▀███▀▀▀▀▀   ▀███████████ ███            ███    "
echo -e "    ███     ▀███████████   ███    ███ ███    █▄      ███    "
echo -e "    ███       ███    ███   ███    ███ ███    ███     ███    "
echo -e "   ▄████▀     ███    ███   ███    █▀  ████████▀     ▄████▀  "
echo -e "              ███    ███                                    "
echo -e "${blue}"
echo -e "   ▄████████     ███        ▄████████  ▄████████    ▄█   ▄█▄"
echo -e "  ███    ███ ▀█████████▄   ███    ███ ███    ███   ███ ▄███▀"
echo -e "  ███    █▀     ▀███▀▀██   ███    ███ ███    █▀    ███▐██▀  "
echo -e "  ███            ███   ▀   ███    ███ ███         ▄█████▀   "
echo -e "▀███████████     ███     ▀███████████ ███        ▀▀█████▄   "
echo -e "         ███     ███       ███    ███ ███    █▄    ███▐██▄  "
echo -e "   ▄█    ███     ███       ███    ███ ███    ███   ███ ▀███▄"
echo -e " ▄████████▀     ▄████▀     ███    █▀  ████████▀    ███   ▀█▀"
echo -e "                                                   ▀        "
echo -e "${white}  no-code build your own funnel website"
echo -e "${reset}  by At Risk Media"
echo ""

# Validate Story Keep path exists and contains astro.config.mjs
if [ ! -d "$STORYKEEP_PATH" ] || [ ! -f "$STORYKEEP_PATH/astro.config.mjs" ]; then
  echo -e "${red}Error: Invalid Story Keep directory at $STORYKEEP_PATH${reset}"
  exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Step 1: Update starter template
echo -e "${blue}1. Updating Tract Stack starter template...${reset}"
cd "$PROJECT_ROOT" && git pull
if [ $? -ne 0 ]; then
  echo -e "${red}Error: Failed to update starter template${reset}"
  exit 1
fi

# Function to copy directory contents while preserving specific paths (silent)
copy_directory() {
  local src="$1"
  local dest="$2"
  local preserve=("$3")

  mkdir -p "$dest"
  for item in "$src"/*; do
    if [ -e "$item" ]; then
      base_name=$(basename "$item")
      if [[ " ${preserve[@]} " =~ " ${base_name} " ]]; then
        continue
      fi
      if [ -d "$item" ]; then
        copy_directory "$item" "$dest/$base_name" "${preserve[@]}"
      else
        cp -f "$item" "$dest/$base_name" 2>/dev/null
      fi
    fi
  done
}

# Step 2: Copy files
echo -e "${blue}2. Updating files...${reset}"
copy_directory "$TEMPLATE_DIR/src" "$STORYKEEP_PATH/src" "custom"
copy_directory "$TEMPLATE_DIR/public" "$STORYKEEP_PATH/public" "custom styles"
cp -f "$TEMPLATE_DIR/astro.config.mjs" "$STORYKEEP_PATH/" 2>/dev/null
cp -f "$TEMPLATE_DIR/tailwind.config.cjs" "$STORYKEEP_PATH/" 2>/dev/null
cp -f "$TEMPLATE_DIR/tsconfig.json" "$STORYKEEP_PATH/" 2>/dev/null
cp -f "$TEMPLATE_DIR"/.prettierrc* "$STORYKEEP_PATH/" 2>/dev/null
echo -e "${green}Files updated successfully${reset}"

# Step 3: Update package.json
echo -e "${blue}3. Updating package.json...${reset}"
if [ -f "$TEMPLATE_DIR/package.json" ] && [ -f "$STORYKEEP_PATH/package.json" ]; then
  if command -v jq >/dev/null 2>&1; then
    jq -s '
      def merge_unique($base; $extra):
        $base + ($extra | to_entries | map(select(.key as $k | $base[$k] | not)) | from_entries);
      
      .[0] as $template |
      .[1] as $local |
      $template + {
        "dependencies": merge_unique($template.dependencies; $local.dependencies),
        "devDependencies": merge_unique($template.devDependencies; $local.devDependencies)
      } + 
      if $local.packageManager then {"packageManager": $local.packageManager} else {} end +
      if $local.name then {"name": $local.name} else {} end
    ' "$TEMPLATE_DIR/package.json" "$STORYKEEP_PATH/package.json" >"$TEMP_DIR/package.json" 2>/dev/null &&
      mv "$TEMP_DIR/package.json" "$STORYKEEP_PATH/package.json" &&
      echo -e "${green}Package.json updated successfully${reset}" ||
      echo -e "${yellow}Note: jq failed, package.json not fully updated${reset}"
  else
    echo -e "${yellow}Note: jq not installed, package.json not fully updated${reset}"
  fi
fi

# Step 4: Install packages
echo -e "${blue}4. Installing updated packages...${reset}"
cd "$STORYKEEP_PATH" && pnpm install
if [ $? -ne 0 ]; then
  echo -e "${red}Error: Failed to install packages${reset}"
  exit 1
fi

# Final step
echo -e "${green}Story Keep update complete!${reset}"
echo -e "${blue}Run ~/scripts/build.sh to apply changes${reset}"
