# Etcd Module

[Etcd](https://etcd.io/) is a strongly consistent, distributed key-value store that provides a reliable way to store data that needs to be accessed by a distributed system or cluster of machines.

## Install

```bash
npm install @testcontainers/etcd --save-dev
```

## Examples

<!--codeinclude-->
[Read and write key-value pairs:](../../packages/modules/etcd/src/etcd-container.test.ts) inside_block:readWrite
<!--/codeinclude-->

<!--codeinclude-->
[Subscribe to key changes:](../../packages/modules/etcd/src/etcd-container.test.ts) inside_block:subscribe
<!--/codeinclude-->
