# Azure Service Bus Emulator

## Install

```bash
npm install @testcontainers/azureservicebus --save-dev
```

## Examples

These examples use the following libraries:

- [@azure/service-bus](https://www.npmjs.com/package/@azure/service-bus)

        npm install @azure/service-bus

Choose an image from the [container registry](https://mcr.microsoft.com/en-us/artifact/mar/azure-messaging/servicebus-emulator) and substitute `IMAGE`.

### Send/receive queue messages

<!--codeinclude-->
[](../../packages/modules/azureservicebus/src/azureservicebus-container.test.ts) inside_block:serviceBusConnect
<!--/codeinclude-->

### Customize queues/topics

<!--codeinclude-->
[](../../packages/modules/azureservicebus/src/azureservicebus-container.test.ts) inside_block:serviceBusValidEmulatorConfig
<!--/codeinclude-->

### Customize the MS SQL container

<!--codeinclude-->
[](../../packages/modules/azureservicebus/src/azureservicebus-container.test.ts) inside_block:serviceBusCustomMssqlContainer
<!--/codeinclude-->
