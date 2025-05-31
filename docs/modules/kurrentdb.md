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
