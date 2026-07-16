#!/usr/bin/env bash
# One-command CI activation, once the GitHub token has the `workflow` scope
# (github.com/settings/tokens). See docs/ci/README.md for context.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f docs/ci/github-workflow-ci.yml ]; then
  echo "Nothing to do: docs/ci/github-workflow-ci.yml not found (already activated?)"
  exit 0
fi

mkdir -p .github/workflows
git mv docs/ci/github-workflow-ci.yml .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions workflow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
echo
echo "CI activated. Recommended follow-ups:"
echo "  1. Repo settings → Branches → protect 'main', requiring the 'checks' job."
echo "  2. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID repository secrets for the deploy job."
