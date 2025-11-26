# S3Mock

## Install

```bash
npm install @testcontainers/s3mock --save-dev
```

## Examples

These examples use the following libraries:

- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)

        npm install @aws-sdk/client-s3

Choose an image from the [container registry](https://hub.docker.com/r/adobe/s3mock) and substitute `IMAGE`.

### Create a S3 bucket

<!--codeinclude-->
[](../../packages/modules/s3mock/src/s3mock-container.test.ts) inside_block:s3mockCreateS3Bucket
<!--/codeinclude-->
