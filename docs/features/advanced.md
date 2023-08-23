# Advanced

## Container Runtime Client

Testcontainers configures an underlying container runtime to perform its tasks. This runtime works automatically with several providers like Docker, Podman, Colima, Rancher Desktop and Testcontainers Desktop. There are too many usage examples to list here, but here are some common examples:

### Fetch container runtime information

```js
import { getContainerRuntimeClient } from "testcontainers";

const containerRuntimeClient = await getContainerRuntimeClient();

console.log(containerRuntimeClient.info);
```

### Pulling an image

```js
import { ImageName } from "testcontainers";

await containerRuntimeClient.image.pull(ImageName.fromString("alpine:3.12"))
```

### Starting a container

```js
const container = await containerRuntimeClient.container.create({ ... });
await containerRuntimeClient.container.start(container);
```

### Starting a Docker Compose environment

```js
const environment = await containerRuntimeClient.compose.up({ ...})
```

### Starting a network

```js
const network = await containerRuntimeClient.network.create({ ... })
```
