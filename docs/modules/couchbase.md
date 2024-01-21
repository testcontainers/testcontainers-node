# Couchbase Module

[Couchbase](https://www.couchbase.com/) is a distributed document database with a powerful search engine and in-built operational and analytical capabilities. It brings the power of NoSQL to the edge and provides fast, efficient bidirectional synchronization of data between the edge and the cloud.


## Install

```bash
npm install @testcontainers/couchbase --save-dev
```

## Examples

<!--codeinclude-->
[upsertAndGet:](../../packages/modules/couchbase/src/couchbase-container.test.ts) inside_block:upsertAndGet
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/couchbase/src/couchbase-container.test.ts) inside_block:connectAndQuery
<!--/codeinclude-->
