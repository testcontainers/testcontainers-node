---
name: triage-issue
description: Triages a testcontainers-node GitHub issue. Checks it has what's needed, searches issues and docs for an existing answer, verifies root-cause claims, reproduces it, writes the failing regression test for a real bug, and drafts a reply and labels for approval. Use when asked to look at, triage, answer, reproduce, investigate or fix an issue or bug report, or when a container hangs, times out, can't find a runtime, fails to authenticate, or leaks.
argument-hint: "[issue number]"
---

# Triage an issue

Many reports turn out to be the environment, a container runtime, or another library rather than testcontainers. The aim is to settle each issue in one response: ask for exactly what's missing, point to the existing answer and its workaround, or confirm the bug with a failing test.

## 1. Read it

1. Read the issue with `gh issue view <N> --json title,body,labels,comments`.
2. Check the bug report template fields, and note anything you'd need to reproduce it or locate the cause. The usual gaps are:
   - the `DEBUG=testcontainers*` logs
   - the container runtime and its version
   - the test runner
   - a minimal repro
   - the last version that worked

## 2. Look for an existing answer

Don't work from a fixed list of causes. Runtimes, Bun, Docker Desktop and testcontainers itself keep changing, so look for the current answer:

1. Find where it stopped. Search the source for the error and the last `DEBUG` lines before it: `grep -rn "<message>" packages/testcontainers/src`.
2. Search issues and PRs, open and closed, for that message or symptom:
   - `gh issue list --state all --search "<message>"`
   - `gh pr list --state all --search "<message>"`

   Check whether an open PR already links to the issue, and whether a fix shipped after the reporter's version.
3. Check `docs/` for a documented limitation or workaround, for example `docs/supported-container-runtimes.md`.
4. If the cause looks like a runtime, test runner or another library, search that project's issues too.

If nothing answers it and the report is missing what you need, draft one reply that asks for all of it, and stop there.

## 3. Verify claims

Reports often arrive with an AI-written diagnosis citing files and lines. Treat it as a lead, not a fact:

- Check the cited code against `main`.
- Check any claim about what another Testcontainers implementation does against that repository. When the bug involves another binding or Ryuk itself, read that code too.
- For a regression, diff the release tags: `git log --oneline v<good>..v<bad> -- packages/testcontainers/src/<area>`.

## 4. Reproduce

- Run the repro with `DEBUG=testcontainers*`. Tests run against the source. A standalone script needs `npm run build -w packages/testcontainers` first.
- If it fails, strip it down to raw dockerode calls or the `docker` CLI. If it still fails without testcontainers, the bug is upstream, so point the reporter there.
- The Docker host may be shared with other sessions, and other runs can adopt a reaper you start. Remove any containers you create.

## 5. Real bug: failing test first

1. Add the case to the existing co-located `*.test.ts`, following the nearest similar test. For example, `reaper.test.ts` spies on `client.container.list`, and `docker-container-client.test.ts` fakes dockerode streams.
2. Confirm the test fails for the reported reason (red-green, AGENTS.md).
3. Look for sibling call sites with the same bug.
4. Keep the test for the fix PR. If you are only triaging, revert it and describe it in the reply.

## 6. Draft the response

Draft for the user to approve:

- **A short reply.** Either the missing information, the existing answer with its workaround and a link, or a bug confirmation with a one-line root cause and the fix plan. If an open PR already fixes it, link that PR.
- **Labels.** One of `bug`, `enhancement` or `documentation`. Add `triage` if it still needs investigation, or `duplicate` with a link.
- **Whether to close it.**

Post nothing, label nothing and close nothing without approval. Ship the fix with `open-pr` and `Closes #<N>`.
