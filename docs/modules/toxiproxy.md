# Toxiproxy

## Install

```bash
npm install @testcontainers/toxiproxy --save-dev
```

## Examples

These examples use the following libraries:

- [toxiproxy-node-client](https://www.npmjs.com/package/toxiproxy-node-client)

        npm install toxiproxy-node-client

Choose an image from the [container registry](https://github.com/Shopify/toxiproxy/pkgs/container/toxiproxy) and substitute `IMAGE`.

### Create a proxy

<!--codeinclude-->
[](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:create_proxy
<!--/codeinclude-->

### Add a toxic

<!--codeinclude-->
[](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:adding_toxic
<!--/codeinclude-->

### Enable/disable the proxy

<!--codeinclude-->
[](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:enabled_disabled
<!--/codeinclude-->
