---
name: update-dependencies
description: Gets Dependabot PRs green and mergeable, fixes module images that disappeared or moved registry, and runs npm audit fix passes in testcontainers-node. Use when a Dependabot PR (npm, Docker image, GitHub Actions) is failing or needs a decision, an image pull fails (404, 401, "manifest unknown", rate limit), or when asked to fix a Dependabot PR, run npm audit, fix vulnerabilities, or bump, hold back or ignore a dependency.
argument-hint: "[PR number]"
---

# Dependency updates

Dependabot (`.github/dependabot.yml`) opens grouped weekly PRs for npm, module Dockerfiles, GitHub Actions and devcontainers. Find the failure with `diagnose-ci`, then match it below.

## Known failure shapes

**`npm ci` fails with ERESOLVE (every Lint job red).** A major version bump falls outside another package's peer range. TypeScript was held back this way several times.

- Fix: on the Dependabot branch, revert that package to its previous version, run `npm install --package-lock-only`, and commit with a message saying why.
- If the conflict will last, propose an `ignore` entry in `dependabot.yml` with a comment.

**A runtime dependency's new major is ESM-only (smoke tests red).** This breaks CJS and Jest consumers (AGENTS.md).

- Confirm with the smoke tests from `checks.yml`.
- Fix: keep the old major and add a `dependabot.yml` major-version ignore, as done for `archiver` and `get-port`.
- devDependencies don't affect consumers.

**A Docker tag is odd.** Dependabot sometimes picks an arch-suffixed tag (e.g. `…arm64`) or a pre-release.

- Fix: switch to the plain multi-arch tag, and check it with `docker manifest inspect <image:tag>`.

**Two versions of the same image collapsed.** Dependabot bumps every `FROM` line for one image to the same tag.

- Fix: hardcode the older version in its test file (AGENTS.md).

**A client SDK changed its API (one module's tests red).**

- Fix: update the tests. Check that the docs examples included from them still read well.

**An image is gone or moved (pull fails with 404 or 401).**

- Find a replacement. Prefer, in order:
  1. a newer tag in the same repository
  2. the vendor's official repository on another registry
  3. a trusted rebuild such as Chainguard
- See what the other implementations' modules moved to (AGENTS.md "Cross-language Implementations").
- Update the `FROM` line, keeping the line order, and the registry link in `docs/modules/<x>.md`.
- If the tag or feature no longer exists upstream, drop that test case and say why.
- Title the PR after the move, e.g. `Pull the MinIO image from Quay`.

## Committing on a Dependabot PR

- Push fix-ups to the Dependabot branch itself, one change per commit. Show the commit before pushing, never bypass signing, and ask before any force push (AGENTS.md).
- Once you push, Dependabot stops rebasing the PR, and `@dependabot recreate` would discard your commit.
- If a newer grouped PR supersedes a red one, close the old one rather than fixing both.

## npm audit pass

1. Run `npm audit fix` on a new branch from `main`, never with `--force`. It must stay lockfile-only. A fix that needs a `package.json` range change is the user's call.
2. Verify per AGENTS.md. Then run `npm audit --omit=dev` and note what remains.
3. Open `Apply npm audit fixes` with `open-pr` (`dependencies` + `patch`).
   - List the open Dependabot security PRs it supersedes.
   - Say what remains unfixed.
   - Explain why it isn't breaking (lockfile-only, manifests unchanged).
