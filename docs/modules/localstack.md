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

!!! note "Authentication requirements"
    Starting on March 23, 2026, LocalStack moved to authenticated image releases. Older pinned tags may continue to work without `LOCALSTACK_AUTH_TOKEN`, but newer releases require it.

    Prefer pinning a specific image tag instead of using `latest`. If the image tag you use requires authentication, pass `LOCALSTACK_AUTH_TOKEN` when starting the container:

    ```typescript
    const token = process.env.LOCALSTACK_AUTH_TOKEN;

    if (!token) {
      throw new Error("LOCALSTACK_AUTH_TOKEN must be set for authenticated LocalStack images");
    }

    const container = await new LocalstackContainer("localstack/localstack:IMAGE")
      .withEnvironment({ LOCALSTACK_AUTH_TOKEN: token })
      .start();
    ```

    Refer to the [LocalStack announcement](https://blog.localstack.cloud/localstack-single-image-next-steps/) for the current rollout details.

### Create a S3 bucket

<!--codeinclude-->
[](../../packages/modules/localstack/src/localstack-container.test.ts) inside_block:localstackCreateS3Bucket
<!--/codeinclude-->
