# ArangoDB

## Install

```bash
npm install @testcontainers/arangodb --save-dev
```

## Example

This example uses the following libraries:

- [arangojs](https://www.npmjs.com/package/arangojs/v/6.0.0-alpha.0)

        npm install arangojs

---

Choose an image from [Docker Hub](https://hub.docker.com/_/arangodb) and substitute `IMAGE`.

<!--codeinclude-->
[Creating an ArangoDB container](../../packages/modules/arangodb/src/arangodb-container.test.ts) inside_block:example
<!--/codeinclude-->
