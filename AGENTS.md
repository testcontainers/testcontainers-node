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
- Test-only helper files under `src` (for example `*-test-utils.ts`) must be explicitly excluded from package `tsconfig.build.json` so they are not emitted into `build` and accidentally published.
- Vitest runs tests concurrently by default (`sequence.concurrent: true` in `vitest.config.ts`).
  - Tests that rely on shared/global mocks (for example `vi.spyOn` on shared loggers/singletons) can be flaky due to interleaving or automatic mock resets.
  - Prefer asserting observable behavior instead of shared global mock state when possible.
  - If a test must depend on shared/global mock state, use `it.sequential(...)` or `describe.sequential(...)`.

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
5. Verify git diff only contains intended files.
6. Never commit, push, or post on GitHub (issues, PRs, or comments) without first sharing the proposed diff/message and getting explicit user approval.
7. Commit with focused message(s), using `git commit --no-verify`.
8. Push branch. Ask for explicit user permission before any force push.
9. Open PR against `main` using a human-readable title (no `feat(...)` / `fix(...)` prefixes).
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
