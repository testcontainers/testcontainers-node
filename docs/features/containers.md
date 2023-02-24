# Containers

## Starting a container

Testcontainers will use an existing image if it exists, otherwise it will pull the image:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine").start();
```

The default pull behaviour can be overridden by specifying a pull policy:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPullPolicy(new AlwaysPullPolicy())
  .start();
```

A specific image version can be provided:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine:3.10").start();
```

### With a command

Creating a container with a command:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();
```

### With an entrypoint

Creating a container with entrypoint:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withEntrypoint(["cat"])
  .start();
```

### With environment variables

Creating a container with environment variables:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withEnvironment({ 
    ENV_1: "ENV_VALUE_1", 
    ENV_2: "ENV_VALUE_2", 
  })
  .start();
```

### With bind mounts

Creating a container with bind mounts:

```javascript
const { GenericContainer } = require("testcontainers");

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

Creating a container with labels:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withLabels({
    label1: "value1",
    label2: "value2",
  })
  .start();
```

### With a name

Creating a container with a specified name:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withName("custom-container-name")
  .start();
```

### With files/content

Copy a file to a container before it is started:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
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

### With a `tmpfs` mount

Creating a container with a `tmpfs` mount:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
  .start();
```

### With default log driver

Specifying a default log driver. You can override the logging driver used by Docker to be the default one (json-file).
This might be necessary when the driver of your docker host does not support reading logs
and you want to use the `Wait.forLogMessage` wait strategy. This is the same as
[--log-driver json-file on docker run](https://docs.docker.com/config/containers/logging/configure/#configure-the-logging-driver-for-a-container).

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withDefaultLogDriver()
  .start();
```

### With user

Creating and running a container with a specific user, note that the value can be a username or UID (format: `<name|uid>[:<group|gid>]`):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withUser("bob")
  .start();
```

### With privileged mode

Creating a container with privileged mode:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPrivilegedMode()
  .start();
```

### With added capabilities

Creating a container with added [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("aline")
  .withAddedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

### With dropped capabilities

Creating a container with dropped [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("aline")
  .withDroppedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

### With ulimits

Creating a container with ulimits:

```javascript
const { GenericContainer } = require("testcontainers");

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

Creating a container with [IPC mode](https://docs.docker.com/engine/reference/run/#ipc-settings---ipc):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withIpcMode("host")
  .start();
```

## Stopping a container

Testcontainers by default will not wait until the container has stopped. It will simply issue the stop command and return immediately:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres").start();
await container.stop();
```

If you need to wait for the container to be stopped, you can provide a timeout:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres").start();
await container.stop({ timeout: 10000 }); // ms
```

Testcontainers by default will remove volumes created by the container when stopped. This behaviour can be configured:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres").start();
await container.stop({ removeVolumes: false });
```

## Restarting a container

Restarting a container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine").start();
await container.restart();
```

## Exposing ports

You can provide the ports you want to expose from the container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(22, 80, 443)
  .start();
```

Testcontainers will automatically bind an available, random port on the host to each exposed port. This is to avoid port conflicts when running tests quickly or in parallel. 

You can retrieve the mapped port as follows:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(80)
  .start();

const httpPort = container.getMappedPort(80);
```

Though not recommended, you can provide fixed ports:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts({
    container: 80,
    host: 80
  })
  .start();
```

## Reusing a container

Enabling container reuse, note that two containers are considered equal if their options (exposed ports, commands, mounts, etc) match. This also works across multiple processes:

```javascript
const { GenericContainer } = require("testcontainers");

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

## Running commands

Execute commands inside a running container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

## Streaming logs

Stream logs from a running container:
```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .start();

const stream = await container.logs();
stream
    .on("data", line => console.log(line))
    .on("err", line => console.error(line))
    .on("end", () => console.log("Stream closed"));
```
