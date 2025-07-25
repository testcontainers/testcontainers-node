# Couchbase

## Install

```bash
npm install @testcontainers/couchbase --save-dev
```

## Examples

These examples use the following libraries:

- [couchbase](https://www.npmjs.com/package/couchbase)

        npm install couchbase

Choose an image from the [container registry](https://hub.docker.com/r/couchbase/server) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/couchbase/src/couchbase-container.test.ts) inside_block:connectAndQuery
<!--/codeinclude-->
