# PostgreSQL

## Install

```bash
npm install @testcontainers/postgresql --save-dev
```

## Examples

These examples use the following libraries:

- [pg](https://www.npmjs.com/package/pg)

        npm install pg
        npm install @types/pg

Choose an image from the [container registry](https://hub.docker.com/_/postgres) and substitute `IMAGE`.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:pgConnect
<!--/codeinclude-->

### Connect via URI

<!--codeinclude-->
[](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:pgUriConnect
<!--/codeinclude-->

### With database

<!--codeinclude-->
[](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:pgSetDatabase
<!--/codeinclude-->

### With username

<!--codeinclude-->
[](../../packages/modules/postgresql/src/postgresql-container.test.ts) inside_block:pgSetUsername
<!--/codeinclude-->

### Snapshots

!!! warning
    You should never pass the `"postgres"` system database as the container database name if you want to use snapshots.
    The Snapshot logic requires dropping the connected database and using the system database to run commands, which will
    not work if the database for the container is set to `"postgres"`.

<!--codeinclude-->
[](../../packages/modules/postgresql/src/postgresql-container-snapshot.test.ts) inside_block:createAndRestoreFromSnapshot
<!--/codeinclude-->
