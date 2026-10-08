---
name: publish-release
description: Prepares, dry-runs, publishes and verifies a testcontainers-node npm release (testcontainers plus every @testcontainers/* module), and recovers from a failed publish. Use when cutting, preparing, dry-running or publishing a release, reviewing the draft release notes, or fixing a failed publish run.
argument-hint: "[version]"
disable-model-invocation: true
---

# Publish a release

Release Drafter keeps a draft GitHub release current as PRs merge. Publishing that draft triggers `npm-publish.yml`, which:

1. bumps every workspace to the new version
2. commits `v<version>` to `main` and pushes it
3. runs `npm publish --ws`

Running the same workflow manually (`workflow_dispatch`) is a dry run. An npm version can never be republished, so get explicit user approval before publishing.

Copy this checklist and track progress:

```
- [ ] Draft reviewed (labels, version, titles)
- [ ] No hidden breaking changes
- [ ] Dry run green
- [ ] User approved publishing
- [ ] Published and verified on npm
```

## 1. Review the draft

1. Read the draft with `gh release view v<draft>`.
2. List the PRs merged since the last release: `gh pr list --state merged --search "merged:>=<last release date>" --json number,title,labels`.
3. Check:
   - Every PR has a type label and a semver label. Without a type label, a PR is missing from the notes. Without a semver label, it counts as patch.
   - The version is right for the highest semver label.
   - The titles read as release notes. Fix a title on the PR itself.

## 2. Look for hidden breaking changes

- Diff runtime dependencies since the last tag: `git diff v<last>..main -- 'packages/**/package.json'`.
- Flag any new major version that is ESM-only (AGENTS.md).
- Also check whether `engines.node` changed, or exports were removed or renamed.

## 3. Dry run

The version must be plain `x.y.z`: no `v` prefix and no trailing dot.

```bash
gh workflow run npm-publish.yml --ref main -f version=<x.y.z>
gh run watch $(gh run list --workflow npm-publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

If the dry run fails, fix the cause in a normal PR first.

## 4. Publish and verify

After approval, publish the draft (`gh release edit v<x.y.z> --draft=false --latest`) and watch the run. Then confirm:

- `main` has the `v<x.y.z>` commit.
- `npm view testcontainers version` and `npm view @testcontainers/<module> version` (spot-check a few modules) report `x.y.z`.

## Recovery

- **Version commit pushed but nothing published:**
  1. Revert the `v<x.y.z>` commit on `main`. A plain re-run fails with nothing to commit.
  2. Fix the cause.
  3. Re-run the publish.
- **Only some packages published:** a published version can't be republished. Ship a new patch release for all packages. Never unpublish without the user's explicit decision.
- **A regression shipped:** fix forward with a patch release.
