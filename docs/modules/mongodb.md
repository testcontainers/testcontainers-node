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

## MongoDB Atlas Local

The MongoDB Atlas Local image combines the MongoDB database engine with MongoT for Atlas Search.

Choose an image from the [container registry](https://hub.docker.com/r/mongodb/mongodb-atlas-local) and substitute `IMAGE`.
The connection string returned by `getConnectionString()` does not include `directConnection=true`; pass `directConnection: true` to your MongoDB client options instead.

### Get a connection string

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-atlas-local-container.test.ts) inside_block:connectAtlasLocal
<!--/codeinclude-->

### Get a database connection string

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-atlas-local-container.test.ts) inside_block:connectAtlasLocalDatabase
<!--/codeinclude-->

### Connect with credentials

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-atlas-local-container.test.ts) inside_block:connectAtlasLocalWithCredentials
<!--/codeinclude-->

### Create an Atlas Search index and search it

<!--codeinclude-->
[](../../packages/modules/mongodb/src/mongodb-atlas-local-container.test.ts) inside_block:createAtlasIndexAndSearchIt
<!--/codeinclude-->
