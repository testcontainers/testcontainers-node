# AGENTS.md

## Purpose
This is a working guide for contributors and coding agents in this repository.
It captures practical rules that prevent avoidable CI and PR churn.

## Development Expectations
- If a public API changes, update the relevant docs in the same PR.
- Tests should verify observable behavior changes, not only internal/config state.
- Example: for a security option, assert a real secure/insecure behavior difference.

## Permission and Escalation
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
4. Run required checks: `npm run format`, `npm run lint`, and targeted tests.
5. Verify git diff only contains intended files.
6. Commit with focused message(s).
7. Push branch.
8. Open PR against `main` using a human-readable title (no `feat(...)` / `fix(...)` prefixes).
9. Add labels for both change type and semantic version impact.
10. Ensure PR body includes:
    - summary of changes
    - verification commands run
    - test results summary
    - `Closes #<issue>`

## Labels
### Change type
- `enhancement`
- `bug`
- `dependencies`
- `documentation`
- `maintenance`

### Semver impact
- `major`
- `minor`
- `patch`

### Common mappings
- backward-compatible feature: `enhancement` + `minor`
- backward-compatible bug fix: `bug` + `patch`
- breaking change: type label + `major`
- docs-only change: `documentation` + usually `patch`
- dependency update: `dependencies` + impact label based on user-facing effect

## Practical Note
- Recheck `package-lock.json` after `npm install` for unrelated drift and revert unrelated changes.
