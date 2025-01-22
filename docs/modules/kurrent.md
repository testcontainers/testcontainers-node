# Kurrent Module

[Kurrent](https://kurrent.io) is an event sourcing database that stores data in streams of immutable events.

## Install

```bash
npm install @testcontainers/kurrent --save-dev
```

## Examples

<!--codeinclude-->
[Start container:](../../packages/modules/kurrent/src/kurrent-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

<!--codeinclude-->
[Subscribe to standard projection:](../../packages/modules/kurrent/src/kurrent-container.test.ts) inside_block:usingStandardProjections
<!--/codeinclude-->
