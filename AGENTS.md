# AGENTS.md

## Purpose

This is a working guide for contributors and coding agents in this repository.
It captures practical rules that prevent avoidable CI and PR churn.

## Development Expectations

- If a public API changes, update the relevant docs in the same PR.
- If new types are made part of the public API, export them from the package's `index.ts` in the same PR.
- If new learnings or misunderstandings are discovered, propose an `AGENTS.md` update in the same PR.
- Tests should verify observable behavior changes, not only internal/config state.
  - Example: for a security option, assert a real secure/insecure behavior difference.

## Permission and Escalation

- `npm install` requires escalated permissions for outbound network access to npm registries.
- `npm test` commands should b`e run with escalation so tests can access the Docker socket.

### Escalation hygiene

- Use specific commands and clear justifications.
- Prefer narrow reruns rather than broad full-suite reruns when iterating.

## PR Process

1. Start from `main`.
2. Create a branch prefixed with `codex/`.
3. Implement scoped changes only.
4. Run required checks: `npm run format`, `npm run lint`, and targeted tests.
5. Verify git diff only contains intended files. If changes are still being discussed, do not commit or push; share the diff and get user approval first.
6. Commit with focused message(s), using `git commit --no-verify`.
7. Push branch. Ask for explicit user permission before any force push.
8. Open PR against `main` using a human-readable title (no `feat(...)` / `fix(...)` prefixes).
9. Before posting any comment on GitHub issues or PRs, share the proposed message with the user and get explicit approval.
10. Add labels for both change type and semantic version impact.
11. Ensure PR body includes:
    - summary of changes
    - verification commands run
    - test results summary
    - if semver impact is not `major`, evidence that the change is not breaking
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
