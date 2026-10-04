#!/bin/sh
# Start OpenDash on macOS / Linux. Same steps as start-opendash.bat:
# check Node, upgrade the data folder if needed, rebuild index.html, then run
# the server under tools/supervisor.mjs (starts it again if it crashes, and
# handles Settings > Server > Restart). Ctrl+C or closing the terminal stops both.
#   ./start-opendash.sh                       default data folder ./data, port 4173
#   ./start-opendash.sh --data-dir ~/dash --port 4300
# start-dashboard.sh (the old name) is a shim that runs this file.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed. Install the LTS version (20 or newer) from https://nodejs.org"
  echo "  (or with your package manager, e.g. 'brew install node'), then run this again."
  echo
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo
  echo "  OpenDash needs Node.js 20 or newer. You have $(node -v)."
  echo "  Install the LTS version from https://nodejs.org, then run this again."
  echo
  exit 1
fi
node tools/migrate.mjs --auto "$@"
code=$?
if [ "$code" -eq 2 ]; then echo; echo "  OpenDash was NOT started. Run the command above once, then start again."; exit 1; fi
if [ "$code" -ne 0 ]; then echo; echo "  A data migration failed. Your data folder backup is in data/backups/. OpenDash was NOT started."; exit 1; fi
node build.mjs || { echo "  BUILD FAILED - OpenDash was NOT started."; exit 1; }
echo
echo "  Starting OpenDash... press Ctrl+C to stop it."
echo "  If it crashes it is started again; Settings > Server can restart it."
echo
exec node tools/supervisor.mjs "$@"
