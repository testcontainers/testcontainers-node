# ClickHouse

## Install

```bash
npm install @testcontainers/clickhouse --save-dev
```

## Examples

These examples use the following libraries:

- [@clickhouse/client](https://www.npmjs.com/package/@clickhouse/client)

        npm install @clickhouse/client

---

Choose an image from [Docker Hub](https://hub.docker.com/r/clickhouse/clickhouse-server) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithOptions
<!--/codeinclude-->

### Connect with URL

<!--codeinclude-->
[](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithUrl
<!--/codeinclude-->

### Connect with credentials

<!--codeinclude-->
[](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithUsernameAndPassword
<!--/codeinclude-->

### Set database

<!--codeinclude-->
[](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:setDatabase
<!--/codeinclude-->
