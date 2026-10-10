---
name: review-pr
description: Reviews a testcontainers-node pull request (own or a contributor's) against the maintainer's recurring review feedback and drafts terse inline comments for approval. Use when asked to review, check, look over or give feedback on a PR, PR number, branch or diff, for a self-review before opening a PR, and when the @claude GitHub Action is asked to review.
argument-hint: "[PR number]"
---

# Review a PR

Aim to raise in one pass everything the maintainer would otherwise raise over several rounds.

## Gather

```bash
gh pr view <N> --json title,body,labels,headRefName,comments,reviews
gh api repos/testcontainers/testcontainers-node/pulls/<N>/comments   # inline review comments
gh pr diff <N>
gh pr checks <N>
```

- Read the linked issue, and read the surrounding code as well as the hunks.
- Treat earlier review rounds as context. Check that previously requested changes were made, and don't repeat points already raised.
- If CI is red, find out why first (`diagnose-ci`).
- For fork PRs, `gh pr checks` can look green while the workflows wait for approval. Check `gh run list --branch <head>`. If CI hasn't run, say so.
- For a new module, also apply the `add-module` rules.

## What to look for

- **Title and labels:** they follow `open-pr`, and the semver label matches the real impact.
- **Tests:**
  - Each test can actually fail. Flag tests that only read back getters, check a string's shape, or assert `toBeDefined()` on an API that returns 200 on errors.
  - Each option has a test that would fail if the option never reached the container.
  - Bug fixes come with red-green evidence.
  - New cases extend the nearest existing test file with the same setup (real Docker or a mocked client) rather than adding new files.
- **Concurrency:** no shared containers, `process.env` or spies without `{ concurrent: false }`. Use `await using`. No skipping when Docker is unavailable.
- **Completeness:** a fix applied to one path is also applied to its siblings, for example `restart()` next to `start()`, or the reuse path next to the create path.
- **Docs:** public API changes are documented, and module examples use `codeinclude` (AGENTS.md).
- **Design:**
  - Zero-config defaults work, and invalid or half-set config fails fast.
  - The wait strategy is set in the constructor, and waits are robust (listening ports, health check or HTTP rather than log regexes).
  - Images are pinned in the module `Dockerfile`.
- **Scope:**
  - Flag new files for a few lines of logic, dead fallbacks, duplicated constants, getters that exist only for tests, and tests of third-party behaviour.
  - Flag unrelated dependency bumps; leave those to Dependabot.
- **Dependencies:** runtime dependencies load from CommonJS (AGENTS.md), and well-established libraries or built-ins are preferred.
- **Breaking changes:** renamed exports, changed defaults and lowered timeouts all count. They need `major` or a non-breaking alternative.
- **Claims:** check root-cause explanations, and claims about what another Testcontainers implementation does, against the actual code. AI-written PR descriptions are often confidently wrong.

## Write the comments

- Anchor each comment on the line it concerns, one problem per comment. Findings outside the diff hunks, such as an untouched sibling path, go in the review body. Say what's wrong, add a sentence of context if it helps, then say what to do instead. Skip restated background and severity labels.
- Keep the review body to the few must-address points, plus any high-level design note. A short thanks, a numbered list of required changes, then "Nits" matches the maintainer's style.
- Before calling something a convention, check the rest of the repo. Prefer "the other modules do X" to broad claims.
- If there's nothing worth raising, say so.

## Post

**Locally:** show the user every comment (path, line, text), the review body, and any suggested title or label changes. Post nothing until they approve. Then post a single review:

```bash
gh api --method POST repos/testcontainers/testcontainers-node/pulls/<N>/reviews --input review.json
# {"event":"COMMENT","body":"...","comments":[{"path":"...","line":42,"side":"RIGHT","body":"..."}]}
```

**As the `@claude` GitHub Action:** the triggering comment is the approval, so post the inline comments directly. Put any title or label suggestions in your reply; never change labels, approve or merge.
