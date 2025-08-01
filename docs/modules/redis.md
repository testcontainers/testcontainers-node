# Redis

## Install

```bash
npm install @testcontainers/redis --save-dev
```

## Examples

These examples use the following libraries:

- [redis](https://www.npmjs.com/package/redis)

        npm install redis

Choose an image from the [container registry](https://hub.docker.com/_/redis) and substitute `IMAGE`.

### Set/get a value

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:redisStartContainer
<!--/codeinclude-->

### With password

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:redisStartWithCredentials
<!--/codeinclude-->

### With persistent data

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:persistentData
<!--/codeinclude-->

### With predefined data

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:withPredefinedData
<!--/codeinclude-->

### Redis stack

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:startWithRedisStack
<!--/codeinclude-->

### Execute a command inside the container

<!--codeinclude-->
[](../../packages/modules/redis/src/redis-container.test.ts) inside_block:executeCommand
<!--/codeinclude-->
