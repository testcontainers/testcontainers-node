# RabbitMQ

## Install

```bash
npm install @testcontainers/rabbitmq --save-dev
```

## Examples

These examples use the following libraries:

- [amqplib](https://www.npmjs.com/package/amqplib)

        npm install amqplib
        npm install @types/amqplib --save-dev

Choose an image from the [container registry](https://hub.docker.com/_/rabbitmq) and substitute `IMAGE`.

### Produce/consume a message

<!--codeinclude-->
[](../../packages/modules/rabbitmq/src/rabbitmq-container.test.ts) inside_block:pubsub
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/rabbitmq/src/rabbitmq-container.test.ts) inside_block:credentials
<!--/codeinclude-->
