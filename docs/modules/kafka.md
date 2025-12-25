# Kafka

## Install

```bash
npm install @testcontainers/kafka --save-dev
```

## Examples

### Kafka 8.x

These examples use the following libraries:

- [@confluentinc/kafka-javascript](https://www.npmjs.com/package/@confluentinc/kafka-javascript)

        npm install @confluentinc/kafka-javascript

Choose an image from the [container registry](https://hub.docker.com/r/confluentinc/cp-kafka) and substitute `IMAGE`.

#### Produce/consume a message

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-latest.test.ts) inside_block:kafkaLatestConnect
[`assertMessageProducedAndConsumed`](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With SSL

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-latest.test.ts) inside_block:kafkaLatestSsl
[`assertMessageProducedAndConsumed`](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

---

### Kafka 7.x

These examples use the following libraries:

- [@confluentinc/kafka-javascript](https://www.npmjs.com/package/@confluentinc/kafka-javascript)

        npm install @confluentinc/kafka-javascript

Choose an image from the [container registry](https://hub.docker.com/r/confluentinc/cp-kafka) and substitute `IMAGE`.

#### Produce/consume a message

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectBuiltInZK
[`assertMessageProducedAndConsumed`](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With SSL

<!--codeinclude-->
[Code](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:kafkaSsl
[`assertMessageProducedAndConsumed`](../../packages/modules/kafka/src/test-helper.ts) inside_block:kafkaTestHelper
<!--/codeinclude-->

#### With provided ZooKeeper

<!--codeinclude-->
[](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectProvidedZK
<!--/codeinclude-->

#### With Kraft

<!--codeinclude-->
[](../../packages/modules/kafka/src/kafka-container-7.test.ts) inside_block:connectKraft
<!--/codeinclude-->
