# Elasticsearch

## Install

```bash
npm install @testcontainers/elasticsearch --save-dev
```

## Examples

These examples use the following libraries:

- [@elastic/elasticsearch](https://www.npmjs.com/package/@elastic/elasticsearch)

        npm install @elastic/elasticsearch

---

Choose an image from [Docker Hub](https://hub.docker.com/_/elasticsearch) and substitute `IMAGE`.

### Create an index

<!--codeinclude-->
[](../../packages/modules/elasticsearch/src/elasticsearch-container.test.ts) inside_block:createIndex
<!--/codeinclude-->

### Index a document

<!--codeinclude-->
[](../../packages/modules/elasticsearch/src/elasticsearch-container.test.ts) inside_block:indexDocument
<!--/codeinclude-->

### With password

<!--codeinclude-->
[](../../packages/modules/elasticsearch/src/elasticsearch-container.test.ts) inside_block:withPassword
<!--/codeinclude-->
