# CosmosDB

!!!info
    This module uses the **Linux-based** version of the CosmosDB emulator. In general, it:

    - Provides better compatibility on a variety of systems.
    - Consumes significantly less resources.
    - Comes with much faster startup times.
  
    However, not all features of a full CosmosDB are implemented yet. Refer to [this overview](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator-linux#feature-support) for a detailed list.

## Install

```bash
npm install @testcontainers/azurecosmosdb --save-dev
```

## Examples

These examples use the following libraries:

- [@azure/cosmos](https://www.npmjs.com/package/@azure/cosmos)

        npm install @azure/cosmos

---

Choose an image from [Microsoft Artifact Registry](https://mcr.microsoft.com/) and substitute `IMAGE`. For example, `mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/azurecosmosdb/src/azure-cosmosdb-emulator-container.test.ts) inside_block:createAndRead
<!--/codeinclude-->

### With HTTPS

<!--codeinclude-->
[](../../packages/modules/azurecosmosdb/src/azure-cosmosdb-emulator-container.test.ts) inside_block:httpsCreateDB
<!--/codeinclude-->
