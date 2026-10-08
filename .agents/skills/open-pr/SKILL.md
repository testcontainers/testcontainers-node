---
name: open-pr
description: Verifies, commits, pushes and opens a pull request in testcontainers-node following the repo's title, label and PR-body conventions. Use when work is ready to ship ("open a PR", "commit this", "push and raise a PR", "write the PR description") or when choosing a PR title or labels.
---

# Open a PR

Release Drafter turns PR titles into release notes and labels into the version bump (`.github/release-drafter.yml`). Titles and labels matter as much as the code.

Before committing, pushing or opening anything, get the user's approval of the diff, commit message, title and body (AGENTS.md).

## Before committing

- Branch from an up-to-date `main`.
- Run the checks in AGENTS.md "Verification". For bug fixes, keep the red-green output.
- Check that `git diff --stat main...HEAD` shows only the files you intended, and that the lockfile changes only the entries you intended.
- If you changed GitHub Actions, Node or npm versions, or the publish automation, also dry-run the publish workflow against your branch:

  ```bash
  gh workflow run npm-publish.yml --ref <branch> -f version=<next version>
  ```

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

- **Summary:** what changed and why. Link to the Java or Go implementation if you borrowed from it.
- **Verification:** the commands you ran and their results, including red-green evidence for fixes.
- **Not breaking** (unless the PR is labelled `major`): why the change is backward compatible.
- `Closes #<issue>`, only if the PR fully resolves that issue.

Write the body to a file and pass it with `--body-file`. Inline `--body` mangles backticks.

```bash
git push -u origin <branch>
gh pr create --base main --title "<title>" --body-file <path> --label <type> --label <semver>
```

Open it ready for review. Only open it as a draft if the user asks.
