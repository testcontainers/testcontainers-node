# Kafka Module

[Kafka](https://kafka.apache.org/) is an open-source distributed event streaming platform used by thousands of companies for high-performance data pipelines, streaming analytics, data integration, and mission-critical applications.

## Install

```bash
npm install @testcontainers/kafka --save-dev
```

## Examples

<!--codeinclude-->
[Connect to Kafka using in-built ZooKeeper:](../../packages/modules/kafka/src/kafka-container.test.ts) inside_block:connectBuiltInZK
<!--/codeinclude-->

<!--codeinclude-->
[Connect to Kafka using your own ZooKeeper:](../../packages/modules/kafka/src/kafka-container.test.ts) inside_block:connectProvidedZK
<!--/codeinclude-->

<!--codeinclude-->
[Connect to Kafka using SSL:](../../packages/modules/kafka/src/kafka-container.test.ts) inside_block:ssl
<!--/codeinclude-->
