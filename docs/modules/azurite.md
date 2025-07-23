# Azurite

## Install

```bash
npm install @testcontainers/azurite --save-dev
```

## Examples

These examples use the following libraries:

- [@azure/data-tables](https://www.npmjs.com/package/@azure/data-tables)
   
        npm install @azure/data-tables

- [@azure/storage-blob](https://www.npmjs.com/package/@azure/storage-blob)

        npm install @azure/storage-blob

- [@azure/storage-queue](https://www.npmjs.com/package/@azure/storage-queue)

        npm install @azure/storage-queue

---

Choose an image from [Docker Hub](https://hub.docker.com/r/microsoft/azure-storage-azurite) and substitute `IMAGE`.

### Upload/download a blob

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:uploadAndDownloadBlob
<!--/codeinclude-->

### Send/receive queue messages

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:sendAndReceiveQueue
<!--/codeinclude-->

### Create/insert/fetch on a table

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:createAndInsertOnTable
<!--/codeinclude-->

### Custom credentials

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:customCredentials
<!--/codeinclude-->

### Custom ports

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:customPorts
<!--/codeinclude-->

### In memory persistence

<!--codeinclude-->
[](../../packages/modules/azurite/src/azurite-container.test.ts) inside_block:inMemoryPersistence
<!--/codeinclude-->
