---
name: diagnose-ci
description: Diagnoses red or flaky GitHub Actions checks in testcontainers-node. Reads the failed step's log and the workflow behind it, compares the run with main and the last green run, searches past PRs and issues for the error, and reproduces it locally before fixing or routing it. Use when CI, a workflow run or a job (Lint, Compile, Smoke tests, Tests) is failing or flaky, e.g. "why is CI red", "is this flaky", "fix the failing test in CI".
argument-hint: "[PR number or run id]"
---

# Diagnose CI

Don't work from a fixed list of failure patterns. The workflows, the runner image, Podman and the images under test all keep changing. Work from the current run and what changed since the last green one.

## 1. Read the failure

1. Find the failed jobs with `gh pr checks <N>`, then read them with `gh run view <run-id> --log-failed`. Note the job, the step and the first error, not the last.
2. Read what that step ran. These files are the source of truth:
   - `.github/workflows/checks.yml` and `test-template.yml`: the jobs, their order and the matrix
   - `.github/actions/`: the Node, npm and Podman setup
   - `.github/scripts/changed-modules.mjs`: which packages ran, and why
3. Check `retry` in `vitest.config.ts`. In CI, a red test failed every attempt, and a test that passed on a retry is still flaky.

## 2. Find what changed

1. Check whether `main` fails the same way: `gh run list --branch main --workflow checks.yml`. Pushes to `main` only run the packages they touch, so find the latest run that included this one. A change to core or root config runs them all.
2. Compare with the last green run of the same job:
   - In the repo: the PR diff, and `git log` for the files the step depends on, such as the module, its `Dockerfile`, `package-lock.json`, `.github/` and `vitest.config.ts`.
   - Outside the repo: the runner image version ("Set up job") and the Podman version ("Verify Podman"). Both change without a commit.
3. Search PRs and issues, open and closed, for the error. A past fix is the best lead:
   - `gh pr list --state all --search "<error>"`
   - `gh issue list --state all --search "<error>"`
4. For a Podman-only failure, `git grep -n -B1 CI_PODMAN` lists the tests already skipped on Podman, and the upstream Podman issue where one is linked.

## 3. Reproduce

- Run the failing file locally on the same runtime and Node version. For Podman, set `DOCKER_HOST` to the Podman socket and `CI_PODMAN=true`, as `podman-setup` does.
- `retry` is 0 unless `CI` is set, so loop the file to catch a flake:

  ```bash
  for i in $(seq 1 20); do npx vitest run <file> || break; done
  ```

- If it fails only in CI and is unrelated to the diff, rerun the failed jobs once (`gh run rerun <run-id> --failed`). Still report it as a flake, with the log link.

## 4. Fix or route

- A dependency or image bump caused it: `update-dependencies`.
- It fails every time: the change from step 2 shows whether the code or the test is wrong. Fix that one.
- It's flaky: treat it as a bug. Look for a wait that passes before the service is ready, state shared between concurrent tests, or a timeout too tight for a slow image. Fix the cause. Don't just raise retries or timeouts.
- Ship the fix with `open-pr`, using the loop output as the red-green evidence.
