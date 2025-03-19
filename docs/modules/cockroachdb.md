# CockroachDB Module

[CockroachDB](https://github.com/cockroachdb/cockroach) is a cloud-native, postgresql compatible, distributed SQL database designed to build, scale, and manage modern, data-intensive applications.


## Install

```bash
npm install @testcontainers/cockroachdb --save-dev
```

## Examples

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query using URI:](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

<!--codeinclude-->
[Set database:](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:setDatabase
<!--/codeinclude-->

<!--codeinclude-->
[Set username:](../../packages/modules/cockroachdb/src/cockroachdb-container.test.ts) inside_block:setUsername
<!--/codeinclude-->
