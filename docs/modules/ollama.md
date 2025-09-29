# Ollama

## Install

```bash
npm install @testcontainers/ollama --save-dev
```

## Examples

Choose an image from the [container registry](https://hub.docker.com/r/ollama/ollama) and substitute `IMAGE`.

### Pull and commit an image

<!--codeinclude-->
[](../../packages/modules/ollama/src/ollama-container.test.ts) inside_block:ollamaPullModel
<!--/codeinclude-->
