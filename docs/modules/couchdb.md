# CouchDB

## Install

```bash
npm install @testcontainers/couchdb --save-dev
```

## Examples

These examples use the following libraries:

- [nano](https://www.npmjs.com/package/nano)

        npm install nano

Choose an image from the [container registry](https://hub.docker.com/_/couchdb) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/couchdb/src/couchdb-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

### Change the default credentials

By default, this module uses `root:root` as credentials.

<!--codeinclude-->
[](../../packages/modules/couchdb/src/couchdb-container.test.ts) inside_block:customCredentials
<!--/codeinclude-->
