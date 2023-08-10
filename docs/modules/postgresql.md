# PostgreSQL Module

[PostgreSQL](https://www.postgresql.org/) is a powerful, open source object-relational database system with over 30 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.

## Install

```bash
npm install @testcontainers/postgresql --save-dev
```

## Examples

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query using URI:](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

<!--codeinclude-->
[Set database:](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:setDatabase
<!--/codeinclude-->

<!--codeinclude-->
[Set username:](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:setUsername
<!--/codeinclude-->
