# Mockserver Module

[MockServer](https://www.mock-server.com/#what-is-mockserver) allows you to mock any server or service via HTTP or HTTPS, such as a REST or RPC service.

## Install

```bash
npm install @testcontainers/mockserver --save-dev
```

## Examples

<!--codeinclude-->
[Start container:](../../packages/modules/mockserver/src/mockserver-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

MockServer includes built-in TLS support. To obtain an HTTPS URL, use the `getSecureUrl` method. Keep in mind that MockServer uses a self-signed certificate.

<!--codeinclude-->
[Using TLS:](../../packages/modules/mockserver/src/mockserver-container.test.ts) inside_block:httpsRequests
<!--/codeinclude-->