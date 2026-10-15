#!/usr/bin/env sh
# Run the website locally: installs packages on first run, starts the dev
# server, and opens http://localhost:3000 in your browser.
cd "$(dirname "$0")" || exit 1
if [ ! -d node_modules ]; then
  echo "Installing packages (first run only)..."
  npm install || exit 1
fi
(sleep 3; URL="http://localhost:3000"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"; fi) >/dev/null 2>&1 &
npm run dev
