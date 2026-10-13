---
name: write-code
description: Writes and refactors TypeScript in testcontainers-node by reusing what the project already has (existing helpers, shared functions, core's building blocks) instead of adding another copy. Use when writing, changing or refactoring code under packages/, e.g. "add an option to the Kafka module", "fix this bug", "add a wait for X", and when review feedback says code is duplicated or should be refactored.
---

# Write code

Biome enforces the lint and formatting rules (`biome.json`). This skill covers what a linter can't see. The most common review finding is new code that repeats something the project already has.

## Before adding code

- Search for code that already does it: in the file, in the package, and in what `testcontainers` exports (`packages/testcontainers/src/index.ts`). If it exists, use it.
- If something close exists, change it so it serves both callers. Don't copy it and adapt the copy.

## When the same code is needed twice

- In one file, extract a helper: a private method, or a function the file doesn't export. Define it below the first function that calls it.
- Across files in a package, move it into a function in its own file.
- Across modules, it belongs in core, exported from `testcontainers`, because modules can't import each other. That adds public API, so propose it instead of copying the code.

## Use what core provides

- Configure containers through the `with*` methods. Don't assign to `this.createOpts` or `this.hostConfig`.
- Wait with a `WaitStrategy` run through `waitForContainer`. Don't call `waitUntilReady` on a strategy or write a polling loop.
- A wait added after start gets what is left of the user's startup timeout, never a fresh one.
