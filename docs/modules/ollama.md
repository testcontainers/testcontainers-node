# Ollama

Testcontainers module for [Ollama](https://hub.docker.com/r/ollama/ollama) .

## Ollama usage examples

You can start an Ollama container instance from any NodeJS application by using:

<!--codeinclude-->
[Ollama container](../../packages/modules/ollama/src/ollama-container.test.ts) inside_block:container
<!--/codeinclude-->

### Pulling the model

<!--codeinclude-->
[Pull model](../../packages/modules/ollama/src/ollama-container.test.ts) inside_block:pullModel
<!--/codeinclude-->

### Create a new Image

In order to create a new image that contains the model, you can use the following code:

<!--codeinclude-->
[Commit Image](../../packages/modules/ollama/src/ollama-container.test.ts) inside_block:commitToImage
<!--/codeinclude-->

And use the new image:

<!--codeinclude-->
[Use new Image](../../packages/modules/ollama/src/ollama-container.test.ts) inside_block:substitute
<!--/codeinclude-->

## Adding this module to your project

```bash
npm install @testcontainers/ollama --save-dev
```