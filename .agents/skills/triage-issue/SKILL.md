---
name: triage-issue
description: Triages a testcontainers-node GitHub issue. Checks it has what's needed, matches known environment and runtime causes, verifies root-cause claims, reproduces it, writes the failing regression test for a real bug, and drafts a reply and labels for approval. Use when asked to look at, triage, answer, reproduce, investigate or fix an issue or bug report, or when a container hangs, times out, can't find a runtime, fails to authenticate, or leaks.
argument-hint: "[issue number]"
---

# Triage an issue

Many reports turn out to be the environment, a container runtime, or another library rather than testcontainers. The aim is to settle each issue in one response: ask for exactly what's missing, give the known cause and workaround, or confirm the bug with a failing test.

## 1. Read it

1. Read the issue with `gh issue view <N> --json title,body,labels,comments`.
2. Search for duplicates with `gh issue list --state all --search "<error text>"`. Check whether an open PR already links to the issue.
3. Check the bug report template fields. If something you need to reproduce it or locate the cause is missing, draft one reply that asks for all of it, and stop there. The usual gaps are:

- the `DEBUG=testcontainers*` logs
- the container runtime and its version
- the test runner
- a minimal repro
- the last version that worked

## 2. Locate the failing phase

The last `DEBUG` lines before the failure show where startup stopped:

| Last lines / error | Phase |
| --- | --- |
| `Could not find a working container runtime strategy` | Runtime detection (`DOCKER_HOST`, socket, Podman/Colima/Desktop config) |
| `credential provider`, `auth config` | Registry auth |
| `Pulling image`, `Failed to pull image` | Pull: rate limit, image moved, auth |
| `Reaper` | Ryuk |
| `waiting for container ports to be bound` | Port-binding pre-wait, which runs before the wait strategy |
| `Port N not bound`, `Log message ... not received`, `Health check not healthy` | Wait strategy |
| `Container is ready`, but the process hangs | Open handles: log streams, reaper socket, runner teardown |
| Containers left running after the run | Ryuk's lifetime, or reaper reuse (`Reusing existing Reaper`) |

## 3. Known causes

| Symptom | Answer |
| --- | --- |
| Hangs or doesn't exit under Bun | Bun issue with Ryuk sockets (oven-sh/bun#13696). Workaround: `TESTCONTAINERS_RYUK_DISABLED=true` |
| Docker errors while nock or msw is active | They intercept dockerode's HTTP. Start containers before enabling mocks. |
| Docker Desktop binds ports late or never | docker/for-mac#7787. Docker Engine and OrbStack aren't affected. |
| Podman 4, Apple `container`, Deno | Not supported. Podman needs 5+. |
| Jest `require()` of an ES module after an upgrade | A runtime dependency went ESM-only. That's our regression: see `update-dependencies`. |
| `withStartupTimeout()` seems ignored | Check whether the time is spent in the port-binding pre-wait. |

## 4. Verify claims

Reports often arrive with an AI-written diagnosis citing files and lines. Treat it as a lead, not a fact:

- Check the cited code against `main`.
- Check any "Java/Go does X" claim against those repositories. When the bug involves another binding or Ryuk itself, read that code too.
- For a regression, diff the release tags: `git log --oneline v<good>..v<bad> -- packages/testcontainers/src/<area>`.

## 5. Reproduce

- Run the repro with `DEBUG=testcontainers*`. Tests run against the source. A standalone script needs `npm run build -w packages/testcontainers` first.
- If it fails, strip it down to raw dockerode calls or the `docker` CLI. If it still fails without testcontainers, the bug is upstream, so point the reporter there.
- The Docker host may be shared with other sessions, and other runs can adopt a reaper you start. Remove any containers you create.

## 6. Real bug: failing test first

1. Add the case to the existing co-located `*.test.ts`, following the nearest similar test. For example, `reaper.test.ts` spies on `client.container.list`, and `docker-container-client.test.ts` fakes dockerode streams.
2. Confirm the test fails for the reported reason (red-green, AGENTS.md).
3. Look for sibling call sites with the same bug.
4. Keep the test for the fix PR. If you are only triaging, revert it and describe it in the reply.

## 7. Draft the response

Draft for the user to approve:

- **A short reply.** Either the missing information, the known cause with its workaround and a link, or a bug confirmation with a one-line root cause and the fix plan. If an open PR already fixes it, link that PR.
- **Labels.** One of `bug`, `enhancement` or `documentation`. Add `triage` if it still needs investigation, or `duplicate` with a link.
- **Whether to close it.**

Post nothing, label nothing and close nothing without approval. Ship the fix with `open-pr` and `Closes #<N>`.
