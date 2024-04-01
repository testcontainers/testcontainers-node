# Qdrant Module

[Qdrant](https://qdrant.tech/) is an open-source, high-performance vector search engine/database. It provides a production-ready service with a convenient API to store, search, and manage points (i.e. vectors) with an additional payload.

## Install

```bash
npm install @testcontainers/qdrant --save-dev
```

## Examples

<!--codeinclude-->
[Connect to Qdrant:](../../packages/modules/qdrant/src/qdrant-container.test.ts)
inside_block:connectQdrantSimple
<!--/codeinclude-->

<!--codeinclude-->
[Connect to Qdrant with an API key:](../../packages/modules/qdrant/src/qdrant-container.test.ts) inside_block:connectQdrantWithApiKey
<!--/codeinclude-->

<!--codeinclude-->
[Customize Qdrant instance with a config file:](../../packages/modules/qdrant/src/qdrant-container.test.ts) inside_block:connectQdrantWithConfig
<!--/codeinclude-->
