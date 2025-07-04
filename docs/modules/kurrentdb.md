# KurrentDB Module

[KurrentDB](https://kurrent.io) is an event sourcing database that stores data in streams of immutable events.

## Install

```bash
npm install @testcontainers/kurrentdb --save-dev
```

## Examples

<!--codeinclude-->
[Start container:](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

<!--codeinclude-->
[Subscribe to standard projection:](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:usingStandardProjections
<!--/codeinclude-->

## Rebranding and protocol

When EventStoreDB rebranded to KurrentDB, they've also changed the protocol name in the connection string.
Historically, `esdb://` was the protocol, but now it is `kurrentdb://`.

This package's `.getConnectionString()` will choose the protocol to use based on the provided image name.

<!--codeinclude-->
[By default, it uses `kurrentdb://`:](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:protocolUsedByDefault
<!--/codeinclude-->

<!--codeinclude-->
[Switches automatically to `esdb://` if the provided image contains `eventstore`:](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:protocolAdaptsToImageName
<!--/codeinclude-->