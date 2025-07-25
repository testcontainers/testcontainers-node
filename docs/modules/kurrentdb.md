# KurrentDB

## Install

```bash
npm install @testcontainers/kurrentdb --save-dev
```

## Examples

These examples use the following libraries:

- [@kurrent/kurrentdb-client](https://www.npmjs.com/package/@kurrent/kurrentdb-client)

        npm install @kurrent/kurrentdb-client

Choose an image from the [container registry](https://hub.docker.com/r/kurrentplatform/kurrentdb) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

### Subscribe to a standard projection

<!--codeinclude-->
[](../../packages/modules/kurrentdb/src/kurrentdb-container.test.ts) inside_block:usingStandardProjections
<!--/codeinclude-->
