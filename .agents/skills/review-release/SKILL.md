---
name: review-release
description: Reviews the draft testcontainers-node GitHub release before a maintainer publishes it, checking labels, the version bump, release-note titles and hidden breaking changes. Use when asked to check, review or prepare the next release or its draft notes. Read-only; agents never publish, and maintainers release by publishing the draft on GitHub.
argument-hint: "[version]"
---

# Review a release

Release Drafter keeps a draft GitHub release current as PRs merge. A maintainer publishes that draft on GitHub, which runs `npm-publish.yml` to bump every workspace, push the `v<version>` commit to `main` and publish to npm.

This skill is read-only. Don't publish or edit the release, run `npm-publish.yml` or `npm publish`, or change PR titles or labels. Report what you find.

## 1. Review the draft

1. Read the draft with `gh release view v<draft>`.
2. List the PRs merged since the last release: `gh pr list --state merged --search "merged:>=<last release date>" --json number,title,labels`.
3. Check:
   - Every PR has a type label and a semver label. Without a type label, a PR is listed uncategorised at the top of the notes. Without a semver label, it counts as patch.
   - The version is right for the highest semver label.
   - The titles read as release notes.

## 2. Look for hidden breaking changes

- Diff runtime dependencies since the last tag: `git diff v<last>..main -- 'packages/**/package.json'`.
- Flag any new major version that is ESM-only (AGENTS.md).
- Also check whether `engines.node` changed, or exports were removed or renamed.

## 3. Report

List each PR whose labels or title need changing, and each possible breaking change, with the fix you suggest. The maintainer applies them and publishes.
