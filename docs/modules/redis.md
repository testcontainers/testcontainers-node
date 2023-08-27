# Redis Module

[Redis](https://redis.io/) The open source, in-memory data store used by millions of developers as a database, cache, streaming engine, and message broker.

## Install

```bash
npm install @testcontainers/redis --save-dev
```

## Examples

<!--codeinclude-->
[Start container:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

<!--codeinclude-->
[Connect redis client to container:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:simpleConnect
<!--/codeinclude-->

<!--codeinclude-->
[Start container with password authentication:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:startWithCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Define volume for persistent/predefined data:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:persistentData
<!--/codeinclude-->

<!--codeinclude-->
[Execute a command inside the container:](../../packages/modules/redis/src/redis-container.test.ts) inside_block:executeCommand
<!--/codeinclude-->
