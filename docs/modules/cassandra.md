# Cassandra

## Install

```bash
npm install @testcontainers/cassandra --save-dev
```

## Examples

These examples use the following libraries:

- [cassandra-driver](https://www.npmjs.com/package/cassandra-driver)

        npm install cassandra-driver

---

Choose an image from [Docker Hub](https://hub.docker.com/_/cassandra) and substitute `IMAGE`.
 
### Execute a query

<!--codeinclude-->
[](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:connectWithCustomCredentials
<!--/codeinclude-->

### With datacenter/rack

<!--codeinclude-->
[](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:customDataCenterAndRack
<!--/codeinclude-->
