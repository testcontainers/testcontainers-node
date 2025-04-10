# ClickHouse Module

[ClickHouse](https://clickhouse.com/) is a column-oriented database management system for online analytical processing (OLAP) that allows users to generate analytical reports using SQL queries in real-time.

## Install

```bash
npm install @testcontainers/clickhouse --save-dev
```

## Examples

<!--codeinclude-->

[Connect and execute query:](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithOptions

<!--/codeinclude-->

<!--codeinclude-->

[Connect using URL and execute query:](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithUrl

<!--/codeinclude-->

<!--codeinclude-->

[Connect with username and password and execute query:](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:connectWithUsernameAndPassword

<!--/codeinclude-->

<!--codeinclude-->

[Set database:](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:setDatabase

<!--/codeinclude-->

<!--codeinclude-->

[Set username:](../../packages/modules/clickhouse/src/clickhouse-container.test.ts) inside_block:setUsername

<!--/codeinclude-->

### Connection URIs

The module provides two methods to get connection URIs:

1. `getConnectionUri()` - Returns a URI in the form of `clickhouse://[username[:password]@][host[:port],]/database`
2. `getHttpConnectionUri()` - Returns a URI in the form of `http://[username[:password]@][host[:port]]`

These URIs can be used with the `@clickhouse/client` package or any other ClickHouse client that supports connection URIs.

!!!tip
The HTTP interface (port 8123) is often easier to use for simple queries and is more widely supported by various clients.
The native interface (port 9000) offers better performance for high-throughput scenarios.
