# Redis Module

[Redis](https://redis.io/) The open source, in-memory data store used by millions of developers as a database, cache, streaming engine, and message broker.

## Install

```bash
npm install @testcontainers/redis --save-dev
```

## Examples

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query using URI:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

<!--codeinclude-->
[Set username:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:setUsername
<!--/codeinclude-->

<!--codeinclude-->
[Execute a query inside the container:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:executeQuery
<!--/codeinclude-->
