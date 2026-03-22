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

### Auth token requirement for `latest` images (from March 23, 2026)

Starting from March 23, 2026, `localstack/localstack:latest` requires a `LOCALSTACK_AUTH_TOKEN` environment variable. If you are using the `latest` tag, or a LocalStack image version that includes this change, you must provide your auth token:

Ensure `LOCALSTACK_AUTH_TOKEN` is set in your environment before starting the container.

```javascript
const container = await new LocalstackContainer("localstack/localstack:latest")
  .withEnvironment({ LOCALSTACK_AUTH_TOKEN: process.env.LOCALSTACK_AUTH_TOKEN })
  .start();
```

You can obtain your auth token from [localstack.cloud](https://app.localstack.cloud). Users pinning to a specific version prior to this change are not affected.

### Create a S3 bucket

<!--codeinclude-->

[](../../packages/modules/localstack/src/localstack-container.test.ts) inside_block:localstackCreateS3Bucket

<!--/codeinclude-->
