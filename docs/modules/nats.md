# Nats Module

[NATS](https://nats.io/) is a simple, secure and high performance open source messaging system for cloud native applications, IoT messaging, and microservices architectures.

## Install

```bash
npm install @testcontainers/nats --save-dev
```

## Examples

<!--codeinclude-->
[Connect:](../../src/modules/nats/src/nats-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Publish and subscribe:](../../src/modules/nats/src/nats-container.test.ts) inside_block:pubsub
<!--/codeinclude-->

<!--codeinclude-->
[Set credentials:](../../src/modules/nats/src/nats-container.test.ts) inside_block:credentials
<!--/codeinclude-->
