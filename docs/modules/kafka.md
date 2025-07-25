# Kafka

## Install

```bash
npm install @testcontainers/kafka --save-dev
```

## Examples

### Kafka 8.x

These examples use the following libraries:

- [kafkajs](https://www.npmjs.com/package/kafkajs)

        npm install kafkajs

Choose an image from the [container registry](https://hub.docker.com/r/confluentinc/cp-kafka) and substitute `IMAGE`.

#### Produce/consume a message

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-latest.test.ts) inside_block:kafkaLatestConnect
[Helper function](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With SSL

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-latest.test.ts) inside_block:kafkaLatestSsl
[Helper function](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

---

### Kafka 7.x

These examples use the following libraries:

- [kafkajs](https://www.npmjs.com/package/kafkajs)

        npm install kafkajs

Choose an image from the [container registry](https://hub.docker.com/r/confluentinc/cp-kafka) and substitute `IMAGE`.

#### Produce/consume a message

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectBuiltInZK
[Helper function](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With SSL

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:kafkaSsl
[Helper function](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With provided ZooKeeper

<!--codeinclude-->
[](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectProvidedZK
<!--/codeinclude-->

#### With Kraft

<!--codeinclude-->
[](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectKraft
<!--/codeinclude-->
