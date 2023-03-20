# Containers

## Starting a container

Create and start any container using a Generic Container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine").start();
```

To use a specific image version:

```javascript
const container = await new GenericContainer("alpine:3.10").start();
```

### With a pull policy

Testcontainers will automatically pull an image if it doesn't exist. This is configurable:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPullPolicy(new AlwaysPullPolicy())
  .start();
```

### With a command

```javascript
const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();
```

### With an entrypoint

```javascript
const container = await new GenericContainer("alpine")
  .withEntrypoint(["cat"])
  .start();
```

### With environment variables

```javascript
const container = await new GenericContainer("alpine")
  .withEnvironment({ ENV: "VALUE" })
  .start();
```

### With bind mounts

**Not recommended.**

Bind mounts are not portable. They do not work with Docker in Docker or in cases where the Docker agent is remote. It is preferred to [copy files/content into the container](../containers#with-filescontent) instead.

```javascript
const container = await new GenericContainer("alpine")
  .withBindMounts([{ 
    source: "/local/file.txt", 
    target:"/remote/file.txt" 
  }, {
    source: "/local/dir",
    target:"/remote/dir",
    mode: "ro"
  }])
  .start();
```

### With labels

```javascript
const container = await new GenericContainer("alpine")
  .withLabels({ label: "value" })
  .start();
```

### With a name

**Not recommended.** 

If a container with the same name already exists, Docker will raise a conflict. If you are specifying a name to enable container to container communication, look into creating a network and using [network aliases](../networking#network-aliases).

```javascript
const container = await new GenericContainer("alpine")
  .withName("custom-container-name")
  .start();
```

### With files/content

```javascript
const container = await new GenericContainer("alpine")
  .withCopyFilesToContainer([{ 
    source: "/local/file.txt", 
    target: "/remote/file1.txt"
  }])
  .withCopyContentToContainer([{ 
    content: "hello world",
    target: "/remote/file2.txt"
  }])
  .start();
```

### With working directory

```javascript
const container = await new GenericContainer("alpine")
  .withWorkingDir("/opt")
  .start();
```

### With default log driver

May be necessary when the driver of your docker host does not support reading logs, and you want to use the [Log output wait strategy](../wait-strategies#log-output).

See [log drivers](https://docs.docker.com/config/containers/logging/configure/#configure-the-logging-driver-for-a-container).

```javascript
const container = await new GenericContainer("alpine")
  .withDefaultLogDriver()
  .start();
```

### With a tmpfs mount

```javascript
const container = await new GenericContainer("alpine")
  .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
  .start();
```

### With user

Value can be a username or UID (format: `<name|uid>[:<group|gid>]`).

```javascript
const container = await new GenericContainer("alpine")
  .withUser("bob")
  .start();
```

### With privileged mode

```javascript
const container = await new GenericContainer("alpine")
  .withPrivilegedMode()
  .start();
```

### With added capabilities

See [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html).

```javascript
const container = await new GenericContainer("alpine")
  .withAddedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

### With dropped capabilities

See [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html).

```javascript
const container = await new GenericContainer("alpine")
  .withDroppedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

### With ulimits

**Not supported in rootless container runtimes.**

```javascript
const container = await new GenericContainer("aline")
  .withUlimits({ 
    memlock: { 
      hard: -1, 
      soft: -1 
    }
  })
  .start();
```

### With IPC mode

See [IPC mode](https://docs.docker.com/engine/reference/run/#ipc-settings---ipc).

```javascript
const container = await new GenericContainer("alpine")
  .withIpcMode("host")
  .start();
```

### With resources quota

**Not supported in rootless container runtimes.**

See [NanoCpu and Memory in ContainerCreate](https://docs.docker.com/engine/api/v1.42/#tag/Container/operation/ContainerCreate) method.

- Memory – Limit in Gigabytes
- CPU – Quota in units of CPUs

```javascript
const container = await new GenericContainer("alpine")
  .withResourcesQuota({ memory: 0.5, cpu: 1 })
  .start();
```

## Stopping a container

Testcontainers by default will not wait until the container has stopped. It will simply issue the stop command and return immediately. This is to save time when running tests.

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop();
```

If you need to wait for the container to be stopped, you can provide a timeout:

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop({ timeout: 10000 }); // ms
```

Volumes created by the container are removed when stopped. This is configurable:

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop({ removeVolumes: false });
```

## Restarting a container

```javascript
const container = await new GenericContainer("alpine").start();
await container.restart();
```

## Reusing a container

Enabling container re-use means that Testcontainers will not start a new container if a Testcontainers managed container with the same configuration is already running. 

This is useful for example if you want to share a container across tests without global set up.

```javascript
const container1 = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withReuse()
  .start();

const container2 = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withReuse()
  .start();

expect(container1.getId()).toBe(container2.getId());
```

## Creating a custom container

You can create your own Generic Container as follows:

```typescript
import {
  GenericContainer,
  TestContainer,
  StartedTestContainer,
  AbstractStartedContainer
} from "testcontainers";

class CustomContainer extends GenericContainer {
  constructor() {
    super("alpine");
  }

  public withCustomMethod(): this {
    // ...
    return this;
  }

  public override async start(): Promise<StartedCustomContainer> {
    return new StartedCustomContainer(await super.start());
  }
}

class StartedCustomContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }

  public withCustomMethod(): void {
    // ...
  }
}

const customContainer: TestContainer = new CustomContainer();
const startedCustomContainer: StartedTestContainer = await customContainer.start();
```

## Exposing container ports

Specify which container ports you want accessible by the host:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(22, 80, 443)
  .start();
```

Testcontainers will automatically bind an available, random port on the host to each exposed container port. This is to avoid port conflicts when running tests quickly or in parallel.

Retrieve the mapped port as follows:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(80)
  .start();

const httpPort = container.getMappedPort(80);
```

If a container exposes a single port, you can use the following convenience method:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(80)
  .start();

const httpPort = container.getFirstMappedPort();
```

Specify fixed host port bindings (**not recommended**):

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts({
    container: 80,
    host: 80
  })
  .start();
```

## Running commands

```javascript
const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

## Streaming logs

```javascript
const container = await new GenericContainer("alpine").start();

(await container.logs())
  .on("data", line => console.log(line))
  .on("err", line => console.error(line))
  .on("end", () => console.log("Stream closed"));
```
