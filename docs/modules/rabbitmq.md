# RabbitMQ Module

[RabbitMQ](https://www.rabbitmq.com/) is a reliable and mature messaging and streaming broker, which is easy to deploy on cloud environments, on-premises, and on your local machine. It is currently used by millions worldwide.

## Install

```bash
npm install @testcontainers/rabbitmq --save-dev
```

## Examples

<!--codeinclude-->
[Connect:](../../packages/modules/rabbitmq/src/rabbitmq-container.test.ts) inside_block:start
<!--/codeinclude-->

<!--codeinclude-->
[Set credentials:](../../packages/modules/rabbitmq/src/rabbitmq-container.test.ts) inside_block:credentials
<!--/codeinclude-->

<!--codeinclude-->
[Publish and subscribe:](../../packages/modules/rabbitmq/src/rabbitmq-container.test.ts) inside_block:pubsub
<!--/codeinclude-->
