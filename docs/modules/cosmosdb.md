# Cosmos DB Emulator Module (Linux-based)

[Azure Cosmos DB](https://azure.microsoft.com/en-GB/products/cosmos-db) is a globally distributed, multi-model database service provided by Microsoft.

## Install

```bash
npm install @testcontainers/azurecosmosdb --save-dev
```

## Examples
<!--codeinclude-->
[Connect to emulator and create a database:](../../packages/modules/azurecosmosdb/src/azure-cosmosdb-emulator-container.test.ts) inside_block:httpCreateDB
<!--/codeinclude-->

<!--codeinclude-->
[Using HTTPS:](../../packages/modules/azurecosmosdb/src/azure-cosmosdb-emulator-container.test.ts) inside_block:httpsCreateDB
<!--/codeinclude-->

<!--codeinclude-->
[Create and read items:](../../packages/modules/azurecosmosdb/src/azure-cosmosdb-emulator-container.test.ts) inside_block:createAndRead
<!--/codeinclude-->

## Caveats
### Compatibility
This testcontainer uses the [linux-based](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator-linux) version. In general, it:

- Provides better compatibility on a variety of systems
- Consumes significantly less resources
- Comes with much faster startup times

However, not all features of a full CosmosDB are implemented yet - please refer to [this overview](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator-linux#feature-support) for a detailed list.