# Mockserver

## Install

```bash
npm install @testcontainers/mockserver --save-dev
```

## Examples

These examples use the following libraries:

- [mockserver-client](https://www.npmjs.com/package/mockserver-client)

        npm install mockserver-client

- [superagent](https://www.npmjs.com/package/superagent)

        npm install superagent
        npm install @types/superagent

Choose an image from the [container registry](https://hub.docker.com/r/mockserver/mockserver) and substitute `IMAGE`.

## Examples

### Mock HTTP request

<!--codeinclude-->
[](../../packages/modules/mockserver/src/mockserver-container.test.ts) inside_block:httpMockServer
<!--/codeinclude-->

### Mock HTTPS request

!!! note
    MockServer uses a self-signed certificate for HTTPS connections.

<!--codeinclude-->
[](../../packages/modules/mockserver/src/mockserver-container.test.ts) inside_block:mockServerHttps
<!--/codeinclude-->
