---
name: review-release
description: Reviews the draft testcontainers-node GitHub release before a maintainer publishes it, checking labels, the version bump, release-note titles and hidden breaking changes, and dry-runs the publish workflow when it has permission. Use when asked to check, review or prepare the next release or its draft notes. Never publishes; maintainers release by publishing the draft on GitHub.
argument-hint: "[version]"
---

# Review a release

Release Drafter keeps a draft GitHub release current as PRs merge. A maintainer publishes that draft on GitHub, which runs `npm-publish.yml` to bump every workspace, push the `v<version>` commit to `main` and publish to npm.

Don't publish or edit the release, run `npm publish` without `--dry-run`, re-run a publish run that a release started, or change PR titles or labels (AGENTS.md "Releases"). The only thing you start is the dry run in step 3. Report what you find.

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

## 3. Dry run

If you have permission to dispatch workflows, dry-run the publish on `main` with the draft's version. A manual dispatch builds every package and runs `npm publish --ws --dry-run`. It doesn't commit, push or publish.

```bash
gh workflow run npm-publish.yml --ref main -f version=<x.y.z>
gh run list --workflow npm-publish.yml --event workflow_dispatch --branch main --limit 1
gh run watch <run-id>
```

Check that the run is named `Dry run publish <x.y.z>` and passes.

## 4. Report

List each PR whose labels or title need changing, and each possible breaking change, with the fix you suggest. Link the dry run and its result, or say you couldn't run it. The maintainer applies the fixes and publishes.
