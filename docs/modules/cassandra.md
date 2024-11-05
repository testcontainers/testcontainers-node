# Cassandra Module

[Cassandra](https://cassandra.apache.org/_/index.html) is a free and open source, distributed NoSQL database management system. It is designed to handle large amounts of data across many commodity servers, providing high availability with no single point of failure.



## Install

```bash
npm install @testcontainers/cassandra --save-dev
```

## Examples

<!--codeinclude-->
[Connect:](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Connect with custom credentials:](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:connectWithCustomCredentials
<!--/codeinclude-->

<!--codeinclude-->
[With custom datacenter / rack](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:customDataSenterAndRack
<!--/codeinclude-->

<!--codeinclude-->
[Insert & fetch data:](../../packages/modules/cassandra/src/cassandra-container.test.ts) inside_block:createAndFetchData
<!--/codeinclude-->
