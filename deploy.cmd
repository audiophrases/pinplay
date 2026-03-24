@echo off
echo Deploying Assets (pinplay)...
npx wrangler deploy --config wrangler.jsonc
echo.
echo Deploying API (pinplay-api)...
cd cloudflare
npx wrangler deploy --config wrangler.toml
cd ..
echo Done!