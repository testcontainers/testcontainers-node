---
name: diagnose-ci
description: Diagnoses red or flaky GitHub Actions checks in testcontainers-node from the job-matrix pattern and failed logs, classifies the cause (dependency resolution, image or SDK change, Podman-only flake, real regression, flaky test) and fixes or routes it. Use when CI, a workflow run or a job (Lint, Compile, Smoke tests, Tests) is failing or flaky, e.g. "why is CI red", "is this flaky", "fix the failing test in CI".
argument-hint: "[PR number or run id]"
---

# Diagnose CI

`checks.yml` decides which packages to run with `.github/scripts/changed-modules.mjs`. A change to one module runs only that module. A change to core or to root config runs every package. Docs-only changes run nothing.

Each selected package then runs:

1. Lint
2. Compile
3. Tests, across Node 22/24 × Docker/Podman

The smoke tests run only when core is selected. In CI, Vitest retries a failing test 3 times, so a red test failed four times in a row. A test that "passed on retry" is still flaky.

## Read the shape first

```bash
gh pr checks <N>
gh run view <run-id> --log-failed | head -300
```

| Pattern | Likely cause |
| --- | --- |
| Every Lint job red | `npm ci` failed, usually a peer-dependency conflict after a bump → `update-dependencies` |
| Smoke tests red | The built package doesn't load under CJS, ESM, Jest or Bun. Often an ESM-only runtime dependency → `update-dependencies` |
| Every Tests job for one module red | Its image is gone or moved, or the client SDK changed → `update-dependencies` |
| Only Podman jobs red, with health-check or startup timeouts on heavy images | Known Podman slowness. If it's unrelated to the diff, rerun with `gh run rerun <run-id> --failed` |
| The same test red on every runtime and Node version | A real regression or a deterministic test bug. Reproduce it locally |

Before blaming the PR, check whether `main` is red in the same place: `gh run list --branch main --workflow checks.yml --limit 5`.

## Fix a flaky test

Treat a flake as a bug and use red-green (AGENTS.md):

1. Reproduce it by looping the single file:

   ```bash
   for i in $(seq 1 20); do npx vitest run <file> || break; done
   ```

2. Find the race. Usual suspects:
   - The port is open before the service is actually ready. Wait using the client's own readiness check.
   - State shared between concurrent tests.
   - A timeout too tight for a slow image.
3. Fix the cause. Don't just raise retries or timeouts.
4. Ship the fix with `open-pr`, using the loop output as the red-green evidence.
