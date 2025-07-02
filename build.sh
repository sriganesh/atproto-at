#!/bin/sh

# Ensure script execution fails if any command fails
set -e

# Install dependencies if needed
npm install

# Execute the build command with all necessary environment variables
NEXT_EXPERIMENTAL_COMPILE_ONLY=1 \
NEXT_EXPERIMENTAL_THIRD_PARTIES=1 \
DISABLE_ESLINT_PLUGIN=true \
NEXT_IGNORE_REF_FOLDER=true \
NEXT_SKIP_TYPE_CHECK=1 \
NEXT_DEPLOYMENT_TARGET=edge \
NODE_OPTIONS="--no-node-snapshot" \
npx @cloudflare/next-on-pages

echo "Build completed successfully!" 