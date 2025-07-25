# Etcd

## Install

```bash
npm install @testcontainers/etcd --save-dev
```

## Examples

These examples use the following libraries:

- [etcd3](https://www.npmjs.com/package/etcd3)

        npm install etcd3

Choose an image from the [container registry](https://quay.io/repository/coreos/etcd?tab=info) and substitute `IMAGE`.

### Read and write key-value pairs

<!--codeinclude-->
[](../../packages/modules/etcd/src/etcd-container.test.ts) inside_block:readWrite
<!--/codeinclude-->

### Subscribe to key changes

<!--codeinclude-->
[](../../packages/modules/etcd/src/etcd-container.test.ts) inside_block:etcdSubscribe
<!--/codeinclude-->
 