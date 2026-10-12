---
name: update-dependencies
description: Gets Dependabot PRs green and mergeable, fixes module images that disappeared or moved registry, and runs npm audit fix passes in testcontainers-node. Use when a Dependabot PR (npm, Docker image, GitHub Actions) is failing or needs a decision, an image pull fails (404, 401, "manifest unknown", rate limit), or when asked to fix a Dependabot PR, run npm audit, fix vulnerabilities, or bump, hold back or ignore a dependency.
argument-hint: "[PR number]"
---

# Dependency updates

Dependabot opens grouped weekly PRs for npm, the module Dockerfiles, GitHub Actions and the other ecosystems listed in `.github/dependabot.yml`.

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
- **Hold back** when the new version can't be used yet. On the Dependabot branch, revert that one package or `FROM` line to its previous version. After reverting an npm package, run `npm install --package-lock-only`. Say why in the commit message.
- **Ignore** when it will stay unusable, for example a runtime dependency that became ESM-only. Propose an `ignore` entry in `dependabot.yml` with a comment saying why.

The AGENTS.md rules on runtime dependencies and on module images apply to every bump.

## Older image versions

Users choose their own image tag, so a module has to keep working with the older versions the vendor still supports, not only the one in its `Dockerfile`. Check this whenever following an image bump changes module source and not only tests: a new wait, endpoint, flag, default or log line, or a binary run inside the container.

1. Find which versions are still supported, from the vendor's lifecycle page or endoflife.date. Versions past end of life are out of scope: don't test them, and don't add or keep code paths for them.
2. Find how far back the thing you now rely on exists, from the vendor's release notes or its source at older tags.
3. Run the changed path against the oldest supported version with a temporary local test, plus one in between if the gap is large.
   - Check the tag with `docker manifest inspect <image:tag>` first. A tag without an arm64 image runs emulated on Apple Silicon and may not start, so report it as not checked rather than guessing.
   - Don't commit the test or add its images to the suite (AGENTS.md).
4. If a supported version can't take the change, keep the old path for it. Versions that differ in ports, auth or startup get their own class (`add-module`). Dropping a supported version is a breaking change.
5. List in the PR body which versions were run and which were not.

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

## Semver label

- Dependabot adds a semver label for the highest bump in the PR, whatever `labels` in `dependabot.yml` lists. One major bump of a dev dependency labels the whole grouped PR `major`.
- Release Drafter turns that label into our version bump (`open-pr`). A dependency's major is rarely a breaking change for our users, so the label usually needs changing to `patch`.
- Check the label before the PR merges and propose the one that matches the impact on users. Keep `major` only for a real breaking change, such as an ESM-only runtime dependency or a higher Node floor.

## npm audit pass

1. Run `npm audit fix` on a new branch from `main`, never with `--force`. It must stay lockfile-only. A fix that needs a `package.json` range change is the user's call.
2. Verify per AGENTS.md. Then run `npm audit --omit=dev` and note what remains.
3. Open `Apply npm audit fixes` with `open-pr` (`dependencies` + `patch`).
   - List the open Dependabot security PRs it supersedes.
   - Say what remains unfixed.
   - Explain why it isn't breaking (lockfile-only, manifests unchanged).
