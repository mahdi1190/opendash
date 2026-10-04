#!/bin/sh
# start-dashboard.sh - the old name of start-opendash.sh. Kept so shortcuts and
# scripts made before the rename keep working: it runs start-opendash.sh from
# this folder with the same arguments. Use start-opendash.sh for anything new.
here="$(dirname "$0")"
if [ ! -f "$here/start-opendash.sh" ]; then
  echo
  echo "  start-opendash.sh is missing from this folder, so OpenDash cannot start."
  echo
  exit 1
fi
exec sh "$here/start-opendash.sh" "$@"
