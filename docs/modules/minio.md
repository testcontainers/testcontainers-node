# MinIO Module

[MinIO](https://min.io/) is a high performance object storage solution. It is API compatible with the Amazon S3 cloud storage service and can handle unstructured data such as photos, videos, log files, backups, and container images



## Install

```bash
npm install @testcontainers/minio --save-dev
```

## Examples

<!--codeinclude-->
[Connect with default credentials:](../../packages/modules/minio/src/minio-container.test.ts) inside_block:connectWithDefaultCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Connect with custom credentials:](../../packages/modules/minio/src/minio-container.test.ts) inside_block:connectWithCustomCredentials
<!--/codeinclude-->
