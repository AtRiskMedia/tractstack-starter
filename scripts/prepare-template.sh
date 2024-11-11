#!/bin/bash

# Create/clean template directory
cd ..
rm -rf template
mkdir -p template

# Copy core files
cp -r playground/{src,public} template/
cp playground/.prett* template/
cp playground/.env.template template/.env
cp playground/{astro.config.mjs,tailwind.config.cjs,tsconfig.json,env.d.ts,package.json} template/

# Add template documentation
cp playground/README.md template/
cp playground/LICENSE.md template/
