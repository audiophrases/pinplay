@echo off
echo Deploying Assets (pinplay)...
call npx wrangler deploy --config wrangler.jsonc %*
echo.
echo Deploying API (pinplay-api)...
cd cloudflare
call npx wrangler deploy --config wrangler.toml %*
cd ..
echo Done!