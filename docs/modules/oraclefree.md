# Oracle Free

## Install

```bash
npm install @testcontainers/oraclefree --save-dev
```

## Examples

These examples use the following libraries:

- [oracledb](https://www.npmjs.com/package/oracledb)

        npm install oracledb

Recommended to use an image from [this registry](https://hub.docker.com/r/gvenzl/oracle-free) and substitute for `IMAGE`

### Start a database and execute queries

<!--codeinclude-->
[](../../packages/modules/oraclefree/src/oraclefree-container.test.ts) inside_block:customDatabase
<!--/codeinclude-->