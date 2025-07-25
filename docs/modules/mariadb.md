# MariaDB

## Install

```bash
npm install @testcontainers/mariadb --save-dev
```

## Examples

These examples use the following libraries:

- [mariadb](https://www.npmjs.com/package/mariadb)

        npm install mariadb

Choose an image from the [container registry](https://hub.docker.com/_/mariadb) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:mariaDbConnect
<!--/codeinclude-->

### Connect via URI

<!--codeinclude-->
[](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:mariaDbUriConnect
<!--/codeinclude-->

### With user

<!--codeinclude-->
[](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:mariaDbSetUsername
<!--/codeinclude-->

### With database

<!--codeinclude-->
[](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:mariaDbSetDatabase
<!--/codeinclude-->
