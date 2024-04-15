# Redpanda

Testcontainers can be used to automatically instantiate and manage [Redpanda](https://redpanda.com/) containers.
More precisely Testcontainers uses the official Docker images for [Redpanda](https://hub.docker.com/r/redpandadata/redpanda)

!!! note
    This module uses features provided in `docker.redpanda.com/redpandadata/redpanda`.

## Install


```bash
npm install @testcontainers/redpanda --save-dev
```

## Example

<!--codeinclude-->
[Connect:](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToKafka
<!--/codeinclude-->

<!--codeinclude-->
[Schema registry:](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToSchemaRegistry
<!--/codeinclude-->

<!--codeinclude-->
[Admin APIs:](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToAdmin
<!--/codeinclude-->

<!--codeinclude-->
[Rest Proxy:](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToRestProxy
<!--/codeinclude-->
