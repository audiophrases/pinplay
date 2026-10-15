#!/usr/bin/env bash
set -e

mkdir -p _site
echo "Preparing Assets (staging _site)..."
# The same list as deploy.cmd: local tools and their data, editor and git
# settings, and scratch files never ship (--delete drops deleted files).
rsync -a --delete --delete-excluded \
  --exclude='.git' --exclude='.wrangler' --exclude='.codegraph' --exclude='.claude' --exclude='node_modules' \
  --exclude='.vscode' --exclude='.githooks' --exclude='__pycache__' \
  --exclude='cloudflare' --exclude='tests' --exclude='_site' \
  --exclude='question-bank' --exclude='listening-studio' --exclude='.generated' \
  --exclude='*.cmd' --exclude='*.bat' --exclude='*.sh' --exclude='*.log' --exclude='*.jsonc' \
  --exclude='*.toml' --exclude='*.md' --exclude='.gitignore' --exclude='.gitattributes' --exclude='.wranglerignore' \
  --exclude='test*.js' --exclude='out*.txt' --exclude='REVERT-commit-*.txt' --exclude='t8.mp3' --exclude='feedback-test.html' \
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
