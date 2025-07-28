# MySQL

## Install

```bash
npm install @testcontainers/mysql --save-dev
```

## Examples

These examples use the following libraries:

- [mysql2](https://www.npmjs.com/package/mysql2)

        npm install mysql2

Choose an image from the [container registry](https://hub.docker.com/_/mysql) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:mysqlConnect
<!--/codeinclude-->

### Execute a query inside the container

<!--codeinclude-->
[](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:mysqlExecuteQuery
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:mysqlUriConnect
<!--/codeinclude-->
