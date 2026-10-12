---
name: write-code
description: Writes and refactors TypeScript in testcontainers-node following the code conventions that Biome, knip and tsc don't check (class and helper layout, function size, waits and startup timeouts in modules, reusing core instead of hand-rolling). Use when writing, changing or refactoring code under packages/, e.g. "add an option to the Kafka module", "fix this bug", "split this function up", and when review feedback says code is too long, duplicated or in the wrong place.
---

# Write code

Biome formats and lints, knip removes unused exports, and `tsc` requires `override`. AGENTS.md covers comments, root-cause fixes and import boundaries. The rules below are what none of those catch, and what reviewers keep flagging.

Some files predate a rule. Follow the rule in new code and say that the file is inconsistent, rather than copying it.

## Layout

- Order a container class as fields, constructor, `with*` methods, `start()`, then private helpers. Its `Started*Container` class follows in the same file.
- A helper is a private method, or a function the file doesn't export. Define it below the first function that calls it, so a file reads top-down.
- Mark public methods `public` and give them a return type. `with*` methods return `this` typed as `: this`. Naming the class there breaks chaining in a subclass.
- Name ports and paths as constants at the top of the file.

## Functions

- Keep functions short. When one does several things in sequence, move each into a named helper so the function reads as a list of steps.
- Don't write the same code twice:
  - In one file, extract a helper.
  - Across files in a package, move it into a function in its own file.
  - Across modules, it belongs in core, exported from `testcontainers`, because modules can't import each other. That adds public API, so propose it instead of copying the code.

## Waits and timeouts in modules

- Readiness goes in the wait strategy set in the constructor, combining conditions with `Wait.forAll([...])`. Users can override it there, and `withStartupTimeout` applies to it.
- Setup that needs a running container (`exec`, copying config, HTTP calls) goes in `containerStarted`.
- Wait inside `containerStarted` only when setup has to run before the container can become ready. Call `waitForContainer`, not `waitUntilReady` on a strategy. It also stops and removes the container when the wait fails.
- Waits added after start share the user's startup timeout. Give each one what is left of it with `withStartupTimeout(...)`, never a fresh timeout or its own default. Core applies the timeout only to the constructor's wait strategy.
- Express a condition as a `WaitStrategy` (`Wait.forHttp(...).forResponsePredicate(...)`, `Wait.forSuccessfulCommand(...)`) instead of a polling loop.
- Check every `exec`: throw on a non-zero `exitCode` with `output` in the message.

## Reuse

- Before writing a helper, check what `testcontainers` exports in `packages/testcontainers/src/index.ts` and what a started container offers (`exec`, `copyContentToContainer`, `getMappedPort`).
- Configure the container through `with*` methods such as `withEnvironment` and `withCommand`. Don't assign to `this.createOpts` or `this.hostConfig`.
- Compare image versions with `compare-versions` (`satisfies(this.imageName.tag, ">=8.0.0")`).
- Log with `log` from `testcontainers`, not `console`.

## Details

- Default with `??`, not `||`.
- An option that may be unset is `undefined` (`private password?: string`), not `""`.
- Test titles start with `should`.
