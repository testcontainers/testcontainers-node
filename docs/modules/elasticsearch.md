# Elastic Search Module

[Elasticsearch](https://www.elastic.co/elasticsearch/) is a search engine based on the Lucene library. It provides a distributed, multitenant-capable full-text search engine with an HTTP web interface and schema-free JSON documents.

## Install

```bash
npm install @testcontainers/elasticsearch --save-dev
```

## Examples

<!--codeinclude-->
[Create an index:](../../src/modules/elasticsearch/src/elasticsearch-container.test.ts) inside_block:createIndex
<!--/codeinclude-->

<!--codeinclude-->
[Index a document:](../../src/modules/elasticsearch/src/elasticsearch-container.test.ts) inside_block:indexDocument
<!--/codeinclude-->
