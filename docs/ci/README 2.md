# CI workflow (pending)

The GitHub Actions workflow lives here temporarily: the current git
credential lacks the `workflow` scope, so pushes containing
`.github/workflows/` are rejected.

To activate CI:

1. Add the `workflow` scope to the GitHub personal access token
   (github.com/settings/tokens), and
2. `mkdir -p .github/workflows && git mv docs/ci/github-workflow-ci.yml .github/workflows/ci.yml`
3. Commit and push.
