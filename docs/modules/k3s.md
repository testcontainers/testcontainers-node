# K3s

!!! warning
    This container runs privileged, as it spawns its own containers. For this reason, this container will not work in certain rootless Docker, Docker-in-Docker, or other environments that disallow privileged containers.

## Install

```bash
npm install @testcontainers/k3s --save-dev
```

## Examples

These examples use the following libraries:

- [@kubernetes/client-node](https://www.npmjs.com/package/@kubernetes/client-node)

        npm install @kubernetes/client-node

Choose an image from the [container registry](https://hub.docker.com/r/rancher/k3s) and substitute `IMAGE`.

### List nodes

<!--codeinclude-->
[](../../packages/modules/k3s/src/k3s-container.test.ts) inside_block:k3sListNodes
<!--/codeinclude-->
 
### Start a pod

<!--codeinclude-->
[](../../packages/modules/k3s/src/k3s-container.test.ts) inside_block:k3sStartPod
<!--/codeinclude-->

### Aliased kubeconfig

<!--codeinclude-->
[](../../packages/modules/k3s/src/k3s-container.test.ts) inside_block:k3sAliasedKubeConfig
<!--/codeinclude-->
