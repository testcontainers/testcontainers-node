# Azurite Module

[Azurite](https://github.com/Azure/Azurite) is an open source Azure Storage API compatible server (emulator). Based on Node.js, Azurite provides cross platform experiences for developers wanting to try Azure Storage easily in a local environment. Azurite simulates most of the commands supported by Azure Storage with minimal dependencies.

## Install

```bash
npm install @testcontainers/azurite --save-dev
```

## Examples

<!--codeinclude-->
[Upload and download a blob:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:uploadAndDownloadBlob
<!--/codeinclude-->

<!--codeinclude-->
[Send and receive queue messages:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:sendAndReceiveQueue
<!--/codeinclude-->

<!--codeinclude-->
[Create and insert on table:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:createAndInsertOnTable
<!--/codeinclude-->

<!--codeinclude-->
[Use custom credentials:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:customCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Use custom ports:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:customPorts
<!--/codeinclude-->

<!--codeinclude-->
[Enable in-memory persistence:](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:inMemoryPersistence
<!--/codeinclude-->
