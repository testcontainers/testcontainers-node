# ScyllaDB Module

[ScyllaDB](https://www.scylladb.com/) is a distributed NoSQL wide-column database for data-intensive apps that require high performance and low latency. It was designed to be compatible with Apache Cassandra while achieving significantly higher throughputs and lower latencies.



## Install

```bash
npm install @testcontainers/scylladb --save-dev
```

## Examples

<!--codeinclude-->
[Connect:](../../packages/modules/scylladb/src/scylladb-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Insert & fetch data:](../../packages/modules/scylladb/src/scylladb-container.test.ts) inside_block:createAndFetchData
<!--/codeinclude-->
