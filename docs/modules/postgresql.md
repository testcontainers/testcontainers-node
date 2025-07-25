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

### Using Snapshots

This example shows the usage of the postgres module's Snapshot feature to give each test a clean database without having
to recreate the database container on every test or run heavy scripts to clean your database. This makes the individual
tests very modular, since they always run on a brand-new database.

!!! tip
    You should never pass the `"postgres"` system database as the container database name if you want to use snapshots. 
    The Snapshot logic requires dropping the connected database and using the system database to run commands, which will
    not work if the database for the container is set to `"postgres"`.

<!--codeinclude-->
[Test with a reusable Postgres container](../../packages/modules/postgresql/src/postgresql-container-snapshot.test.ts) inside_block:createAndRestoreFromSnapshot
<!--/codeinclude-->