# Valkey

## Install

```bash
npm install @testcontainers/valkey --save-dev
```

## Examples

These examples use the following libraries:

- [redis](https://www.npmjs.com/package/redis)

        npm install redis

Choose an image from the [container registry](https://hub.docker.com/r/valkey/valkey) and substitute `IMAGE`.

### Set/get a value

<!--codeinclude-->
[](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:valkeyStartContainer
<!--/codeinclude-->

### With password

<!--codeinclude-->
[](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:valkeyWithCredentials
<!--/codeinclude-->

### With persistent data

<!--codeinclude-->
[](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:valkeyWithPersistentData
<!--/codeinclude-->

### With predefined data

<!--codeinclude-->
[](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:valkeyWithPredefinedData
<!--/codeinclude-->

### Execute a command inside the container

<!--codeinclude-->
[](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:valkeyExecuteCommand
<!--/codeinclude-->
