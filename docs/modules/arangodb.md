# ArangoDB

## Install

```bash
npm install @testcontainers/arangodb --save-dev
```

## Example

This example uses the [arangojs](https://www.npmjs.com/package/arangojs/v/6.0.0-alpha.0) library:

```bash
npm install arangojs --save-dev
```

---

Choose an image from [Docker Hub](https://hub.docker.com/_/arangodb) and substitute `IMAGE`:

<!--codeinclude-->
[Creating an ArangoDB container](../../packages/modules/arangodb/src/arangodb-container.test.ts) inside_block:connectArangoDB
<!--/codeinclude-->
