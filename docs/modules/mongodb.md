# MongoDB

## Install

```bash
npm install @testcontainers/mongodb --save-dev
```

## Examples

These examples use the following libraries:

- [mongoose](https://www.npmjs.com/package/mongoose)

        npm install mongoose

Choose an image from the [container registry](https://hub.docker.com/_/mongo) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-container.test.ts) inside_block:connectMongo
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-container.test.ts) inside_block:connectWithCredentials
<!--/codeinclude-->
