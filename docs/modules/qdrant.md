# Qdrant

## Install

```bash
npm install @testcontainers/qdrant --save-dev
```

## Examples

These examples use the following libraries:

- [@qdrant/js-client-rest](https://www.npmjs.com/package/@qdrant/js-client-rest)

        npm install @qdrant/js-client-rest

Choose an image from the [container registry](https://hub.docker.com/r/qdrant/qdrant) and substitute `IMAGE`.

### Fetch collections

<!--codeinclude-->
[](../../packages/modules/qdrant/src/qdrant-container.test.ts)
inside_block:connectQdrantSimple
<!--/codeinclude-->

### With API key

<!--codeinclude-->
[](../../packages/modules/qdrant/src/qdrant-container.test.ts) inside_block:connectQdrantWithApiKey
<!--/codeinclude-->

### With config file

<!--codeinclude-->
[](../../packages/modules/qdrant/src/qdrant-container.test.ts) inside_block:connectQdrantWithConfig
<!--/codeinclude-->
