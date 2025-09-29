# Nats

## Install

```bash
npm install @testcontainers/nats --save-dev
```

## Examples

These examples use the following libraries:

- [@nats-io/transport-node](https://www.npmjs.com/package/@nats-io/transport-node)

        npm install @nats-io/transport-node

- [@nats-io/jetstream](https://www.npmjs.com/package/@nats-io/jetstream)

        npm install @nats-io/jetstream

Choose an image from the [container registry](https://hub.docker.com/_/nats) and substitute `IMAGE`.

### Produce/consume a message

<!--codeinclude-->
[](../../packages/modules/nats/src/nats-container.test.ts) inside_block:natsPubsub
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/nats/src/nats-container.test.ts) inside_block:natsCredentials
<!--/codeinclude-->

### With Jetstream

<!--codeinclude-->
[](../../packages/modules/nats/src/nats-container.test.ts) inside_block:natsJetstream
<!--/codeinclude-->
