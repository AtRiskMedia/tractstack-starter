#!/bin/bash

if [ "$(pwd)" = "$(cd "$(dirname "$0")" && pwd)" ]; then
  cd ..
fi

# Create/clean template directory
rm -rf template
mkdir -p template

# Copy core files
cp -r playground/{src,public} template/
cp playground/.prett* template/
cp playground/.env.template template/.env
cp playground/{astro.config.mjs,tailwind.config.cjs,tsconfig.json,env.d.ts} template/

# Process package.json to remove husky-related content
jq 'del(.scripts.prepare) | del(.devDependencies.husky)' playground/package.json >template/package.json

# Add template documentation
cp playground/README.md template/
cp playground/LICENSE.md template/
