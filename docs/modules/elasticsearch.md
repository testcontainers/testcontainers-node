# Elasticsearch

## Install

```bash
npm install @testcontainers/elasticsearch --save-dev
```

## Examples

These examples use the following libraries. Use the client major that matches your Elasticsearch major:

- [@elastic/elasticsearch 9](https://www.npmjs.com/package/@elastic/elasticsearch) for Elasticsearch 9

        npm install @elastic/elasticsearch@9

- [@elastic/elasticsearch 8](https://www.npmjs.com/package/@elastic/elasticsearch/v/8.19.2) for Elasticsearch 8

        npm install @elastic/elasticsearch@8

Choose an image from the [container registry](https://hub.docker.com/_/elasticsearch) and substitute `IMAGE`.

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
