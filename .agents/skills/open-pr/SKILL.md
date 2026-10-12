---
name: open-pr
description: Verifies, commits, pushes and opens a pull request in testcontainers-node following the repo's title, label and PR-body conventions. Use when work is ready to ship ("open a PR", "commit this", "push and raise a PR", "write the PR description") or when choosing a PR title or labels.
---

# Open a PR

Release Drafter turns PR titles into release notes and labels into the version bump (`.github/release-drafter.yml`). Titles and labels matter as much as the code.

## Before committing

- Branch from an up-to-date `main`.
- Run the checks in AGENTS.md "Verification". For bug fixes, keep the red-green output.
- Check that `git diff --stat main...HEAD` shows only the files you intended, and that the lockfile changes only the entries you intended.

## Commit and push

- Commit with `git commit`. Never bypass signing (`--no-gpg-sign`, `-c commit.gpgsign=false`). If signing fails, stop and ask the user to fix it, then retry.
- Push with `git push -u origin <branch>`. Ask before any force push, including after rebasing an open PR.

## Dry-run the publish

Run the publish dry run against the pushed branch when the change is large or possibly breaking, or could affect the release: GitHub Actions, Node or npm versions, the publish automation, package manifests or build config. A manual dispatch builds every package and runs `npm publish --ws --dry-run`. It doesn't commit, push or publish (AGENTS.md "Releases"). For the version, use the draft release's tag, the row marked `Draft` in `gh release list --limit 3`.

```bash
gh workflow run npm-publish.yml --ref <branch> -f version=<next version>
gh run list --workflow npm-publish.yml --event workflow_dispatch --branch <branch> --limit 1
gh run watch <run-id>
```

Link the run in the PR body. Dispatching needs write access to the repo. Without it, for example from a fork, say in the PR body that the change needs a dry run, so a maintainer can run it before merging.

## Title

Write it as an imperative release-note line about the user-visible change. Don't use conventional-commit prefixes, agent names or branch names.

| Good | Bad |
| --- | --- |
| `Add Mosquitto module` | `Adding module mosquitto`, `feat(mosquitto): add module` |
| `Fix container exec output truncation` | `Fixed exec truncation`, `fix: exec` |

## Labels

Every PR gets exactly one change-type label and one semver label.

| Change | Labels |
| --- | --- |
| Feature or new module | `enhancement` + `minor` |
| Bug fix | `bug` + `patch` |
| Breaking change (removed or renamed export, changed default, ESM-only runtime dependency, higher Node floor) | type label + `major` |
| Docs only | `documentation` + `patch` |
| Dependency update | `dependencies` + its user-facing impact |
| CI, tooling, tests, refactors | `maintenance` + `patch` |

## Body

Include:

- **Summary:** what changed and why. If you followed another Testcontainers implementation, link the code you followed (AGENTS.md "Cross-language Implementations").
- **Verification:** the commands you ran and their results, including red-green evidence for fixes.
- **Not breaking** (unless the PR is labelled `major`): why the change is backward compatible.
- `Closes #<issue>`, only if the PR fully resolves that issue.

```bash
gh pr create --draft --base main --title "<title>" --body "<body>" --label <type> --label <semver>
```

Open it as a draft. Drop `--draft` only if the user asks for a PR that is ready for review. Afterwards, give the user the PR link, title and labels so they can ask for changes.
