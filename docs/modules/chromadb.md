# ChromaDB Module

[ChromaDB](https://www.trychroma.com/) is an AI-native open-source embedding database.

## Install

```bash
npm install @testcontainers/chromadb --save-dev
```

## Resources

* [GitHub](https://github.com/chroma-core/chroma)
* [Node.js Client](https://www.npmjs.com/package/chromadb)
* [Docs](https://docs.trychroma.com)
* [Discord](https://discord.gg/MMeYNTmh3x)
* [Cookbook](https://cookbook.chromadb.dev)

## Examples

<!--codeinclude-->
[Connect to Chroma:](../../packages/modules/chromadb/src/chromadb-container.test.ts)
inside_block:simpleConnect
<!--/codeinclude-->

<!--codeinclude-->
[Create Collection:](../../packages/modules/chromadb/src/chromadb-container.test.ts)
inside_block:createCollection
<!--/codeinclude-->

<!--codeinclude-->
[Query Collection with Embedding Function:](../../packages/modules/chromadb/src/chromadb-container.test.ts)
inside_block:queryCollectionWithEmbeddingFunction
<!--/codeinclude-->

<!--codeinclude-->
[Work with persistent directory:](../../packages/modules/chromadb/src/chromadb-container.test.ts)
inside_block:persistentData
<!--/codeinclude-->

<!--codeinclude-->
[Work with authentication:](../../packages/modules/chromadb/src/chromadb-container.test.ts) inside_block:auth
<!--/codeinclude-->

