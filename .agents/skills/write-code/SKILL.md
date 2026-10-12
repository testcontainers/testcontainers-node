---
name: write-code
description: Writes and refactors TypeScript in testcontainers-node following the code conventions that Biome, knip and tsc don't check (class and helper layout, function size, waits and startup timeouts in modules, reusing core instead of hand-rolling). Use when writing, changing or refactoring code under packages/, e.g. "add an option to the Kafka module", "fix this bug", "split this function up", and when review feedback says code is too long, duplicated or in the wrong place.
---

# Write code

Biome formats and lints, knip removes unused exports, and `tsc` requires `override`. AGENTS.md covers comments, root-cause fixes and import boundaries. The rules below are what none of those catch, and what reviewers keep flagging.

Some files predate a rule. Follow the rule in new code and say that the file is inconsistent, rather than copying it.

## Layout

- Order a container class as fields, constructor, `with*` methods, `start()`, then private helpers. Its `Started*Container` class follows in the same file.
- Define a helper below the first function that calls it, so a file reads top-down. In `kafka-container.ts`, `containerStarted` comes before `updateAdvertisedListeners` and `createUser`.
- Mark public methods `public` and give them a return type. `with*` methods return `this` typed as `: this`. Naming the class there breaks chaining in a subclass.
- Name ports and paths as constants at the top of the file (`const KAFKA_PORT = 9093`).

## Functions

- Keep functions short. Nearly all of them here are under 30 lines.
- When a function does several things in sequence, move each one into a named private helper so the function reads as a list of steps. `KafkaContainer.containerStarted` builds its start script from `commandKraft()`, `commandZookeeper()` and `commandKraftCreateUser()`.
- A block written a second time in the same file becomes a helper.

## Waits and timeouts in modules

- Readiness goes in the wait strategy set in the constructor, combining conditions with `Wait.forAll([...])`. Users can override it there, and `withStartupTimeout` applies to it.
- Setup that needs a running container (`exec`, copying config, HTTP calls) goes in `containerStarted`, as in `RedisContainer`.
- Wait inside `containerStarted` only when setup has to run before the container can become ready. Call `waitForContainer` as `RedpandaContainer` does, not `waitUntilReady` on a strategy. It also stops and removes the container when the wait fails.
- Give every such wait the user's timeout with `withStartupTimeout(this.startupTimeoutMs)` when it is set. Core applies it only to the constructor's wait strategy, so a later wait otherwise runs on its own default.
- Express a condition as a `WaitStrategy` (`Wait.forHttp(...).forResponsePredicate(...)`, `Wait.forSuccessfulCommand(...)`) instead of a polling loop.
- Check every `exec`: throw on a non-zero `exitCode` with `output` in the message.

## Reuse

- Before writing a helper, check what `testcontainers` exports in `packages/testcontainers/src/index.ts` and what a started container offers (`exec`, `copyContentToContainer`, `getMappedPort`).
- Configure the container through `with*` methods such as `withEnvironment` and `withCommand`. Don't assign to `this.createOpts` or `this.hostConfig`.
- Compare image versions with `compare-versions`, as `KafkaContainer` does with `satisfies(this.imageName.tag, ">=8.0.0")`.
- Log with `log` from `testcontainers`, not `console`.
- Modules can't import each other, so short setters such as `withUsername` repeat across modules. Leave those. If two modules need the same non-trivial block, raise moving it into core.

## Details

- Default with `??`, not `||`.
- An option that may be unset is `undefined` (`private password?: string`), not `""`.
- Test titles start with `should`.
