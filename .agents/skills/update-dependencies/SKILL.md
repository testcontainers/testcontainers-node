---
name: update-dependencies
description: Gets Dependabot PRs green and mergeable, fixes module images that disappeared or moved registry, and runs npm audit fix passes in testcontainers-node. Use when a Dependabot PR (npm, Docker image, GitHub Actions) is failing or needs a decision, an image pull fails (404, 401, "manifest unknown", rate limit), or when asked to fix a Dependabot PR, run npm audit, fix vulnerabilities, or bump, hold back or ignore a dependency.
argument-hint: "[PR number]"
---

# Dependency updates

Dependabot (`.github/dependabot.yml`) opens grouped weekly PRs for npm, module Dockerfiles, GitHub Actions and devcontainers.

Don't work from a fixed list of failure causes. Packages, images and registries keep changing. Work from the PR and what the bump changed.

## 1. Find the bump that broke it

1. Read what failed with `diagnose-ci`: the job, the step and the first error.
2. List what the PR bumped with `gh pr view <N> --json body,files`. Narrow it to one package or image, using the failing package, the error and the lockfile diff.
3. Read that dependency's release notes for the versions in between. For an image, check the new tag with `docker manifest inspect <image:tag>`. It should exist and list both amd64 and arm64.
4. See how it was handled before:
   - `gh pr list --state all --search "<package>"`
   - the `ignore` entries in `.github/dependabot.yml`, whose comments record earlier decisions

## 2. Adapt, hold back or ignore

- **Adapt** when the new version is fine and our code or tests need to follow it. If tests changed, check that the docs examples included from them still read well.
- **Hold back** when the new version can't be used yet. On the Dependabot branch, revert that one package or `FROM` line to its previous version. For npm, then run `npm install --package-lock-only`. Say why in the commit message.
- **Ignore** when it will stay unusable, for example a runtime dependency that became ESM-only. Propose an `ignore` entry in `dependabot.yml` with a comment saying why.

The AGENTS.md rules on runtime dependencies and on module images apply to every bump.

## An image no longer pulls

- Find a replacement. Prefer, in order:
  1. a newer tag in the same repository
  2. the vendor's official repository on another registry
  3. a trusted rebuild
- See what the other implementations' modules moved to (AGENTS.md "Cross-language Implementations").
- Update the `FROM` line, keeping the line order, and the registry link in `docs/modules/<x>.md`.
- If the tag or feature no longer exists upstream, drop that test case and say why.

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
