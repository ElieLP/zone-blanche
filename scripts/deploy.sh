#!/bin/sh
# Runs on the server, as the deploy key's only allowed command: brings production
# to a commit of main, given as argument or as the SSH command (`deploy.sh <sha>`).
# All in a function, read in full before running: the checkout below rewrites this file.
set -eu

main() {
  requested="${SSH_ORIGINAL_COMMAND:-}"
  commit="${1:-${requested##* }}"
  case "$commit" in
    "" | *[!0-9a-f]*)
      echo "Usage: deploy.sh <commit sha>" >&2
      exit 64
      ;;
  esac
  cd "$(dirname "$0")/.."
  git fetch --quiet origin main
  git merge-base --is-ancestor "$commit" origin/main || {
    echo "$commit is not on main" >&2
    exit 65
  }
  git reset --quiet --hard "$commit"
  # The build cache outgrows the small disk; keep the recent part (the open data stage).
  docker builder prune --force --keep-storage 1GB >/dev/null
  docker compose up --detach --build --remove-orphans
  docker image prune --force >/dev/null
}

main "$@"
