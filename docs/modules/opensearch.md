# OpenSearch

## Install

```bash
npm install @testcontainers/opensearch --save-dev
```

## Examples

These examples use the following libraries:

- [@opensearch-project/opensearch](https://www.npmjs.com/package/@opensearch-project/opensearch)

        npm install @opensearch-project/opensearch

Choose an image from the [container registry](https://hub.docker.com/r/opensearchproject/opensearch) and substitute `IMAGE`.

### Create an index

<!--codeinclude-->
[](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:opensearchCreateIndex
<!--/codeinclude-->

### Index a document

<!--codeinclude-->
[](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:opensearchIndexDocument
<!--/codeinclude-->

### With password

<!--codeinclude-->
[](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:opensearchCustomPassword
<!--/codeinclude-->
