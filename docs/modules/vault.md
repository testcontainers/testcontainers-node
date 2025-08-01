# Vault

## Install

```bash
npm install @testcontainers/vault --save-dev
```

## Examples

These examples use the following libraries:

- [node-vault](https://www.npmjs.com/package/node-vault)

        npm install node-vault

Choose an image from the [container registry](https://hub.docker.com/r/hashicorp/vault) and substitute `IMAGE`.

### Write/read a value

<!--codeinclude-->
[](../../packages/modules/vault/src/vault-container.test.ts) inside_block:readWrite
<!--/codeinclude-->

### Run CLI init commands at startup

<!--codeinclude-->
[](../../packages/modules/vault/src/vault-container.test.ts) inside_block:initCommands
<!--/codeinclude-->
