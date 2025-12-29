# ChromaDB

## Install

```bash
npm install @testcontainers/chromadb --save-dev
```

## Examples

These examples use the following libraries:

- [chromadb](https://www.npmjs.com/package/chromadb)

        npm install chromadb

- [@chroma-core/default-embed](https://www.npmjs.com/package/@chroma-core/default-embed)

        npm install @chroma-core/default-embed

- [@chroma-core/ollama](https://www.npmjs.com/package/@chroma-core/ollama)

        npm install @chroma-core/ollama

Choose an image from the [container registry](https://hub.docker.com/r/chromadb/chroma) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/chromadb/src/chromadb-container.test.ts) inside_block:chromaCreateCollection
<!--/codeinclude-->

### Embedding function

<!--codeinclude-->
[](../../packages/modules/chromadb/src/chromadb-container.test.ts) inside_block:queryCollectionWithEmbeddingFunction
<!--/codeinclude-->

### Persistent directory

<!--codeinclude-->
[](../../packages/modules/chromadb/src/chromadb-container.test.ts) inside_block:persistentData
<!--/codeinclude-->

### Authentication

<!--codeinclude-->
[](../../packages/modules/chromadb/src/chromadb-container.test.ts) inside_block:chromaAuth
<!--/codeinclude-->
