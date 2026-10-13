# DynamoDB

## Install

```bash
npm install @testcontainers/dynamodb --save-dev
```

## Examples

These examples use the following libraries:

- [@aws-sdk/client-dynamodb](https://www.npmjs.com/package/@aws-sdk/client-dynamodb)

        npm install @aws-sdk/client-dynamodb

Choose an image from the [container registry](https://hub.docker.com/r/amazon/dynamodb-local) and substitute `IMAGE`.

### Connect to local endpoint

In order to use a DynamoDB Client we have to specify
at least `region`, `credentials` and `endpoint` eventhough `region` and `credentials`
will not be used:

<!--codeinclude-->
[](../../packages/modules/dynamodb/src/dynamodb-container.test.ts) inside_block:connectEndpoint
<!--/codeinclude-->

### Connect via client config

The above can also be written as

<!--codeinclude-->
[](../../packages/modules/dynamodb/src/dynamodb-container.test.ts) inside_block:connectClientConfig
<!--/codeinclude-->
 
### Use a shared database

<!--codeinclude-->
[](../../packages/modules/dynamodb/src/dynamodb-container.test.ts) inside_block:sharedDB
<!--/codeinclude-->

### Disable telemetry

<!--codeinclude-->
[](../../packages/modules/dynamodb/src/dynamodb-container.test.ts) inside_block:disabledTelemetry
<!--/codeinclude-->
