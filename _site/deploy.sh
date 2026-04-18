#!/usr/bin/env bash
set -e

mkdir -p _site
echo "Preparing Assets (staging _site)..."
rsync -a --delete \
  --exclude='.git' --exclude='.wrangler' --exclude='node_modules' \
  --exclude='cloudflare' --exclude='tests' --exclude='music' --exclude='_site' \
  --exclude='*.cmd' --exclude='*.sh' --exclude='*.log' --exclude='*.jsonc' \
  --exclude='*.toml' --exclude='*.md' --exclude='.gitignore' --exclude='.wranglerignore' \
  . _site/

echo
echo "Deploying Assets (pinplay-cdn)..."
npx wrangler deploy --config wrangler.jsonc "$@"

echo
echo "Deploying API (pinplay-api)..."
pushd cloudflare > /dev/null
npx wrangler deploy --config wrangler.toml "$@"
popd > /dev/null

echo
echo "Deployment Complete!"
