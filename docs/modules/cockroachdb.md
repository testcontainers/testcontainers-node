# CockroachDB

## Install

```bash
npm install @testcontainers/cockroachdb --save-dev
```

## Examples

These examples use the following libraries:

- [pg](https://www.npmjs.com/package/pg)

        npm install pg
        npm install @types/pg

Choose an image from the [container registry](https://hub.docker.com/r/cockroachdb/cockroach) and substitute `IMAGE`.

### Execute a query
 
<!--codeinclude-->
[](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:cockroachConnect
<!--/codeinclude-->

### Connect with URI

<!--codeinclude-->
[](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

### With database

<!--codeinclude-->
[](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:setDatabase
<!--/codeinclude-->

### With username

<!--codeinclude-->
[](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:setUsername
<!--/codeinclude-->
