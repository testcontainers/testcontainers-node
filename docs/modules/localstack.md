# Localstack

## Install

```bash
npm install @testcontainers/localstack --save-dev
```

## Examples

These examples use the following libraries:

- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)

        npm install @aws-sdk/client-s3

Choose an image from the [container registry](https://hub.docker.com/r/localstack/localstack) and substitute `IMAGE`.

### Create a S3 bucket

<!--codeinclude-->
[Create a S3 bucket:](../../packages/modules/localstack/src/localstack-container.test.ts) inside_block:localstackCreateS3Bucket
<!--/codeinclude-->
 