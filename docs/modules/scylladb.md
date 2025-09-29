# ScyllaDB

## Install

```bash
npm install @testcontainers/scylladb --save-dev
```

## Examples

These examples use the following libraries:

- [cassandra-driver](https://www.npmjs.com/package/cassandra-driver)

        npm install cassandra-driver

Choose an image from the [container registry](https://hub.docker.com/r/scylladb/scylla) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/scylladb/src/scylladb-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->
