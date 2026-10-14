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

## Supported image versions

A module's tests run against every major version the vendor still supports, from the `IMAGES` list in its test file (AGENTS.md "Tests"). Dependabot only bumps the `Dockerfile`, so the older majors in that list are kept current here. Do this on every image bump for a module, and when changing a module for any other reason:

1. List the supported major versions from the vendor's lifecycle page or endoflife.date.
2. Compare them with the module's `IMAGES` list:
   - **A listed major is past end of life:** remove it from the list. Remove the module code that exists only for it in a separate PR, since that is a breaking change.
   - **A supported major is missing:** add the exact tag of its latest release.
   - **A listed major has a newer minor or patch:** move it to that tag.
3. Check each new tag with `docker manifest inspect <image:tag>`. A registry can list a tag before its manifest exists, and the tag should have the same architectures as the `Dockerfile` image.
4. Check that the `Dockerfile` is on the newest supported version, and move it by hand if not. Dependabot has left a `Dockerfile` behind when the vendor changed tag format (Neo4j and ScyllaDB moved to calendar versions) and when the tag is not a plain version (SQL Server `2022-CU13-ubuntu-22.04`).
5. When the bump moves the `Dockerfile` to a new major, add the major it leaves to `IMAGES` in the same PR, if the vendor still supports it.
6. If a supported major fails with the module as changed for the bump, keep the old path for it. Majors that differ in ports, auth or startup get their own class (`add-module`). Dropping a supported major is a breaking change.
7. Check the module source for an image the module starts itself, such as a video recorder or the database behind an emulator. Dependabot doesn't see those. Move it to its latest exact tag and run the module's tests.

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
