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

### Connection Methods

The module provides several methods to connect to the ClickHouse container:

1. `getClientOptions()` - Returns a configuration object suitable for `@clickhouse/client`:

   ```typescript
   {
     url: string; // HTTP URL with host and port
     username: string; // Container username
     password: string; // Container password
     database: string; // Container database
   }
   ```

2. `getConnectionUrl()` - Returns a complete HTTP URL including credentials and database:

   ```
   http://[username[:password]@][host[:port]]/database
   ```

3. `getHttpUrl()` - Returns the base HTTP URL without credentials:
   ```
   http://[host[:port]]
   ```

These methods can be used with the `@clickhouse/client` package or any other ClickHouse client that supports HTTP connections.
