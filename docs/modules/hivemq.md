# HiveMQ

## Install

```bash
npm install @testcontainers/hivemq --save-dev
```

## Examples

These examples use the following libraries:

- [mqtt](https://www.npmjs.com/package/mqtt)

        npm install mqtt

Choose an image from the [container registry](https://hub.docker.com/r/hivemq/hivemq-ce) and substitute `IMAGE`.

### Produce/consume a message

<!--codeinclude-->
[](../../packages/modules/hivemq/src/hivemq-container.test.ts) inside_block:hivemqConnect
<!--/codeinclude-->
