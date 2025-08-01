# Weaviate

## Install

```bash
npm install @testcontainers/weaviate --save-dev
```

## Examples

These examples use the following libraries:

- [weaviate-ts-client](https://www.npmjs.com/package/weaviate-ts-client)

        npm install weaviate-ts-client

Choose an image from the [container registry](https://hub.docker.com/r/semitechnologies/weaviate) and substitute `IMAGE`.

### Connect

<!--codeinclude-->
[](../../packages/modules/weaviate/src/weaviate-container.test.ts) inside_block:connectWeaviateWithClient
<!--/codeinclude-->

### With modules

<!--codeinclude-->
[](../../packages/modules/weaviate/src/weaviate-container.test.ts) inside_block:connectWeaviateWithModules
<!--/codeinclude-->
