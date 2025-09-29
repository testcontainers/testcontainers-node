# Redpanda

## Install

```bash
npm install @testcontainers/redpanda --save-dev
```

## Examples

These examples use the following libraries:

- [kafkajs](https://www.npmjs.com/package/kafkajs)

        npm install kafkajs

Choose an image from the [container registry](https://hub.docker.com/r/redpandadata/redpanda) and substitute `IMAGE`.

### Produce/consume a message

<!--codeinclude-->
[Code](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToKafka
[`assertMessageProducedAndConsumed`](../../packages/modules/redpanda/src/test-helper.ts) inside_block:redpandaTestHelper
<!--/codeinclude-->

### Connect to schema registry

<!--codeinclude-->
[](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToSchemaRegistry
<!--/codeinclude-->

### Connect to admin

<!--codeinclude-->
[](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToAdmin
<!--/codeinclude-->

### Connect to REST proxy

<!--codeinclude-->
[](../../packages/modules/redpanda/src/redpanda-container.test.ts) inside_block:connectToRestProxy
<!--/codeinclude-->
