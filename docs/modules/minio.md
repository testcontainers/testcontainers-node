# MinIO

## Install

```bash
npm install @testcontainers/minio --save-dev
```

## Examples

These examples use the following libraries:

- [minio](https://www.npmjs.com/package/minio)

        npm install minio

Choose an image from the [container registry](https://hub.docker.com/r/minio/minio) and substitute `IMAGE`.

### Upload a file

<!--codeinclude-->
[](../../packages/modules/minio/src/minio-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/minio/src/minio-container.test.ts) inside_block:connectWithCustomCredentials
<!--/codeinclude-->
