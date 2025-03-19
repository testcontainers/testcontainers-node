# Valkey Module

[Valkey](https://valkey.io/) is a distributed, in-memory, key-value store.

## Install

```bash
npm install @testcontainers/valkey --save-dev
```

## Examples

<!--codeinclude-->

[Start container:](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:startContainer

<!--/codeinclude-->

<!--codeinclude-->

[Connect valkey client to container:](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:simpleConnect

<!--/codeinclude-->

<!--codeinclude-->

[Start container with password authentication:](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:startWithCredentials

<!--/codeinclude-->

<!--codeinclude-->

[Define volume for persistent/predefined data:](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:persistentData

<!--/codeinclude-->

<!--codeinclude-->

[Execute a command inside the container:](../../packages/modules/valkey/src/valkey-container.test.ts) inside_block:executeCommand

<!--/codeinclude-->
