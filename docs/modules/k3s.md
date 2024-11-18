# K3s Module

[K3s](https://k3s.io/) is a highly available, certified Kubernetes distribution designed for production workloads in unattended, resource-constrained, remote locations or inside IoT appliances.

## Install

```bash
npm install @testcontainers/k3s --save-dev
```

## Examples

<!--codeinclude-->
[Starting a K3s server:](../../packages/modules/k3s/src/k3s-container.test.ts) inside_block:starting_k3s
<!--/codeinclude-->

<!--codeinclude-->
[Connecting to the server using the Kubernetes JavaScript client:](../../packages/modules/k3s/src/k3s-container.test.ts) inside_block:connecting_with_client
<!--/codeinclude-->

## Known limitations

!!! warning
    * K3sContainer runs as a privileged container and needs to be able to spawn its own containers. For these reasons,
    K3sContainer will not work in certain rootless Docker, Docker-in-Docker, or other environments where privileged
    containers are disallowed.
