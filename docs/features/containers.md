# Containers

## Starting a container

Build and start any container using a Generic Container:

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
  .withEnvironment({ 
    ENV_1: "VALUE_1", 
    ENV_2: "VALUE_2", 
  })
  .start();
```

### With bind mounts

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
  .withLabels({
    label1: "value1",
    label2: "value2",
  })
  .start();
```

### With a name

**Not recommended.** 

If a container with the same name already exists, Docker will raise a conflict. If you are specifying a name to enable container to container communication, look into creating a network and using network aliases.

**TODO: Link to network docs**

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

### With default log driver

May be necessary when the driver of your docker host does not support reading logs
and you want to use the `Wait.forLogMessage` (**TODO ADD LINK**) wait strategy.

See [log drivers](https://docs.docker.com/config/containers/logging/configure/#configure-the-logging-driver-for-a-container).

```javascript
const container = await new GenericContainer("alpine")
  .withDefaultLogDriver()
  .start();
```

### With a tmpfs mount

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(5432)
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

**Not recommended.**

Specify fixed host port bindings:

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
