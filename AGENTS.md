# AGENTS.md

## Purpose
This is a working guide for contributors and coding agents in this repository.
It captures practical rules that prevent avoidable CI and PR churn.

## Permission and Escalation Rules

### `npm install`
- Requires escalated permissions due to network access.

### `npm test`
- Run Docker-backed integration tests with escalation from the start.

### Escalation hygiene
- Use specific commands and clear justifications.
- Prefer narrow reruns rather than broad full-suite reruns when iterating.

## PR Process
1. Start from `main`.
2. Create a branch prefixed with `codex/`.
3. Implement scoped changes only.
4. Run required checks:
   - `npm run format`
   - `npm run lint`
   - targeted tests for touched module(s)
5. Verify git diff only contains intended files.
6. Commit with focused message(s).
7. Push branch.
8. Open PR against `main` using a human-readable title (no conventional-commit-style prefixes like `feat(...)`, `fix(...)`, `chore(...)`).
9. Add labels for both change type and semantic version impact.
10. Ensure PR body includes:
    - summary of changes
    - verification commands run
    - test results summary
    - `Closes #<issue>`

## Labeling Conventions

### Change type labels
- `enhancement`
- `bug`
- `dependencies`
- `documentation`
- `maintenance`

### Semver impact labels
- `major`
- `minor`
- `patch`

### Common mappings
- backward-compatible feature: `enhancement` + `minor`
- backward-compatible bug fix: `bug` + `patch`
- breaking change: type label + `major`
- docs-only change: `documentation` + usually `patch`
- dependency update: `dependencies` + impact label based on user-facing effect

## Practical Repo Notes
- Recheck `package-lock.json` after `npm install` for unrelated drift and revert unrelated changes.
