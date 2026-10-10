---
name: add-module
description: Adds a new Testcontainers module under packages/modules (container class, tests, Dockerfile image pin, docs page, mkdocs nav), or brings a contributor's module PR up to the repo's conventions. Use when asked to add, create, port or support a new container or service module (e.g. "add a RustFS module", "port the Java Pulsar module"), or when adding a second image or class to an existing module.
argument-hint: "[module name]"
---

# Add a module

Copy `package.json`, `tsconfig.json` and `tsconfig.build.json` from any existing module. They have the same shape in every module. In `package.json`, change the name, description, keywords and `devDependencies`. Leave `version` and the `testcontainers` dependency as copied, because the release workflow sets both.

For the container class, tests and docs page, start from the module closest in shape to the new one (same kind of wait, auth or number of ports). The rules below are what reviewers keep flagging on module PRs.

## Before writing code

- Check the module in the other implementations that have it (AGENTS.md "Cross-language Implementations"): the image, ports, wait strategy and defaults, and whether they split major versions into separate classes.
- Pin a concrete, current, multi-arch tag in the module `Dockerfile`, never `latest` or a floating major. `docker manifest inspect <image:tag>` should list both amd64 and arm64.
- The client library used in the tests goes in `devDependencies` (`npm install -w @testcontainers/<name> --save-dev <client>`). Users bring their own client. Add a runtime dependency only if the container class itself needs one.

## Container class

- The constructor sets exposed ports, the wait strategy and `withStartupTimeout(120_000)`. Setting the wait strategy there lets users override it.
- Prefer listening-port, health-check or HTTP waits over log regexes. Log output changes between image versions. Shell-less images need a health-check or HTTP wait.
- Zero config must work: `new XContainer(IMAGE).start()` gives a container a client can connect to. Prefer defaults to getters that can return `undefined`.
- Validate `with*` inputs, and fail fast on half-set config (for example a username without a password) instead of waiting out the startup timeout.
- Started-container getters call `getMappedPort()` when they're invoked. A restarted container can get different host ports.
- Incompatible major versions (different ports, auth or startup) get separate classes, not image-tag parsing.
- Keep it small: no getters that exist only for tests, and no speculative options.

## Tests

- Every test does a real client round trip, such as write then read, or publish then receive. Asserting that getters or connection strings look right proves nothing. Cover the default path and each option that changes behaviour.
- Use `await using`, with one container per test. Tests run concurrently.
- Import from the container file, not `./index`. Read images with `getImage(__dirname, index)` (AGENTS.md).
- Wrap the part a user would copy in `// name {` … `// }` markers inside the `it` body. The docs include these blocks.

## Docs and finish

- Copy the docs page of the module you started from. Examples come only from test blocks via `codeinclude`. Keep the "substitute `IMAGE`" line.
- Add the page to the `mkdocs.yml` Modules nav in alphabetical order.
- Verify per AGENTS.md, including `npx vitest run packages/modules/<name>`.
- The diff should contain only the module directory, the docs page, `mkdocs.yml`, and the lockfile entries for the new workspace and client.
- Open the PR with `open-pr`: title `Add <Name> module`, labels `enhancement` + `minor`.
