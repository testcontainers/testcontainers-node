# AGENTS.md

## Purpose

This is a working guide for contributors and coding agents in this repository.
It captures practical rules that prevent avoidable CI and PR churn.

## Instruction precedence

- Repository-specific instructions in this file override generic coding-agent defaults, skills, and templates.
- If a generic workflow conflicts with this file, follow this file.

## Repository Layout

- This repository is an npm workspaces monorepo.
  - root package: `testcontainers-monorepo`
  - workspaces: `packages/testcontainers` and `packages/modules/*`
  - shared lockfile: root `package-lock.json` (workspace installs update this single file)
- For workspace-scoped dependency changes, prefer targeted commands to reduce lockfile churn:
  - `npm install -w @testcontainers/<module>`
  - `npm uninstall -w @testcontainers/<module> <package>`

## Development Expectations

- If a public API changes, update the relevant docs in the same PR.
- If new types are made part of the public API, export them from the package's `index.ts` in the same PR.
- If new learnings or misunderstandings are discovered, propose an `AGENTS.md` update in the same PR.
- In docs Markdown, keep `<!--codeinclude-->` blocks tight with no blank lines between the markers and the include line, or the rendered snippet will contain blank lines between code lines.
- Tests should verify observable behavior changes, not only internal/config state.
  - Example: for a security option, assert a real secure/insecure behavior difference.
- When adding a regression test for a bug fix, follow a red-green-refactor workflow.
  - Run the focused test against the pre-fix implementation and confirm it fails for the expected reason.
  - Apply the implementation change, rerun the same test, and confirm it passes.
  - Report the red-green evidence in the PR verification summary.
- Test-only helper files under `src` (for example `*-test-utils.ts`) must be explicitly excluded from package `tsconfig.build.json` so they are not emitted into `build` and accidentally published.
- For substantial changes to GitHub Actions, runner images, Node/npm versions, or release/publish automation, consider running the manual `Node.js Package` workflow as a dry-run publish sanity check.
  - Select the PR branch as the workflow ref to test publish workflow changes before merging.
  - Use a representative version input, for example the next planned semver.
- Vitest runs tests concurrently by default (`sequence.concurrent: true` in `vitest.config.ts`).
  - Tests that rely on shared/global mocks (for example `vi.spyOn` on shared loggers/singletons) can be flaky due to interleaving or automatic mock resets.
  - Prefer asserting observable behavior instead of shared global mock state when possible.
  - If a test must depend on shared/global mock state, use `it.sequential(...)` or `describe.sequential(...)`.

## Permission and Escalation

- `npm install` requires escalated permissions for outbound network access to npm registries.
- `npm test` commands should be run with escalation so tests can access the Docker socket.

### Escalation hygiene

- Use specific commands and clear justifications.
- Prefer narrow reruns rather than broad full-suite reruns when iterating.

## PR Process

1. Start from `main`.
2. Create a branch prefixed with `<agent-name>/` (for example `claude/fix-exec-output-truncation`). The PR title must not carry such prefixes (see step 9).
3. Implement scoped changes only.
4. Run required checks: `npm run format`, `npm run lint`, `npm run check-compiles` when touching `packages/testcontainers` APIs consumed by modules, and targeted tests.
   - When working in a fresh git worktree, dependencies are not installed (`node_modules` is absent), so verification commands (tests, `lint`, `format`, `check-compiles`) will fail with "Cannot find module" errors. Run `npm ci` once before verifying. `npm ci` only populates `node_modules` and must not modify `package-lock.json`; if it does, treat that as drift to investigate.
5. Verify git diff only contains intended files.
6. Never commit, push, or post on GitHub (issues, PRs, or comments) without first sharing the proposed diff/message and getting explicit user approval.
7. Commit with focused message(s), using `git commit`.
   - Never bypass signing (for example, do not use `--no-gpg-sign`).
   - If signing fails (for example, passphrase/key issues), stop and ask the user to resolve signing, then retry.
8. Push branch. Ask for explicit user permission before any force push.
9. Open PR against `main` using a human-readable title (no `feat(...)` / `fix(...)` prefixes, and no agent-identifying prefixes or suffixes).
   - Default to a ready-for-review PR. Only open or keep a PR in draft when the user explicitly asks for a draft.
   - When using `gh` to create/edit PR descriptions, prefer `--body-file <path>` over inline `--body`; this avoids shell command substitution issues when the body contains backticks.
10. Add labels for both change type and semantic version impact.
11. Ensure PR body includes:
    - summary of changes
    - verification commands run
    - test results summary
    - if semver impact is not `major`, evidence that the change is not breaking
    - `Closes #<issue>` only when the PR is intended to close a specific issue

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

## Lockfile Hygiene

- Recheck `package-lock.json` after `npm install` for unrelated drift and revert unrelated changes.
