# OpenSearch Module

[OpenSearch](https://opensearch.org/) is a community-driven, open source search and analytics suite derived from Elasticsearch. It provides a distributed, multitenant-capable full-text search engine with an HTTP web interface and schema-free JSON documents.

## Install

```bash
npm install @testcontainers/opensearch --save-dev
```

## Examples

<!--codeinclude-->
[Create an index:](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:createIndex
<!--/codeinclude-->

<!--codeinclude-->
[Index a document:](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:indexDocument
<!--/codeinclude-->

<!--codeinclude-->
[Set a custom password:](../../packages/modules/opensearch/src/opensearch-container.test.ts) inside_block:customPassword
<!--/codeinclude-->
