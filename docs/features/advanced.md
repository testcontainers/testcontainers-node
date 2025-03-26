# Advanced

## Timeout parameter of APIs

Testcontainers library provides a set of classes and functions, and some of them expect a parameter named `timeout`, `ms`, or similar to be passed from the caller. This parameters are of type `number`, and the unit of measurement for this parameters across all public APIs is the same: millisecond. For example:

```js
export interface TestContainer {
  ...
  withStartupTimeout(ms: number): this; // timeout expected to be passed as milliseconds
}
```

The underlying docker APIs may expect different units for timeouts and intervals, and testcontainers library will do the needed conversion under the hood automatically. For example, consider the `stop` method of a container:

```javascript
const container = await new GenericContainer("alpine").start();
await container.stop({ timeout: 10_000 }); // testcontainers library expects the timeout to be passed as milliseconds
```

The Docker API [expects seconds](https://docs.docker.com/reference/api/engine/version/v1.48/#tag/Container/operation/ContainerStop) to be passed to this API call. The 10_000 ms value will be converted to seconds by testontainers library.

Keep in mind that conversion from ms to seconds uses truncation to integer, for example:

```
5000ms = 5s
3800ms = 3s
500ms = 0s
```

You may also pass a *negative* value to function parameters, but this may lead to unexpedted results.

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
const environment = await containerRuntimeClient.compose.up({ ... })
```

### Starting a network

```js
const network = await containerRuntimeClient.network.create({ ... })
```
