# Mosquitto

## Install

```bash
npm install @testcontainers/mosquitto --save-dev
```

## Examples

These examples use the following libraries:

- [mqtt](https://www.npmjs.com/package/mqtt)

        npm install mqtt

Choose an image from the [container registry](https://hub.docker.com/r/eclipse-mosquitto) and substitute `IMAGE`.

### Produce/consume a message (anonymous)

<!--codeinclude-->
[](../../packages/modules/mosquitto/src/mosquitto-container.test.ts) inside_block:mosquittoConnect
<!--/codeinclude-->

### Produce/consume a message (with credentials)

<!--codeinclude-->
[](../../packages/modules/mosquitto/src/mosquitto-container.test.ts) inside_block:mosquittoConnectWithCredentials
<!--/codeinclude-->
