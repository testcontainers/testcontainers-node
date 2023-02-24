# Containers

## Starting a container

Testcontainers will pull the image if it doesn't exist, and re-use it if it does:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .start();
```

Pull behaviour can be overridden by specifying a pull policy:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPullPolicy(new AlwaysPullPolicy())
  .start();
```

Use a specific image version:

```javascript
const container = await new GenericContainer("alpine:3.10")
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

If a container with the same name already exists, Docker will raise a conflict. If you are specifying a name to enable container to container communication, look into creating a network and specifying network aliases instead.

**TODO: Link to network docs**

```javascript
const container = await new GenericContainer("alpine")
  .withName("custom-container-name")
  .start();
```

### With files/content

```javascript
const container = await new GenericContainer("postgres")
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

```javascript
const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
  .start();
```

### With default log driver

You can override the logging driver used by Docker to be the default one (json-file).
This might be necessary when the driver of your docker host does not support reading logs
and you want to use the `Wait.forLogMessage` (**TODO ADD LINK**) wait strategy. 

See [`--log-driver`](https://docs.docker.com/config/containers/logging/configure/#configure-the-logging-driver-for-a-container).

```javascript
const container = await new GenericContainer("redis")
  .withDefaultLogDriver()
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

See available [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html).

```javascript
const container = await new GenericContainer("alpine")
  .withAddedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

### With dropped capabilities

See available [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html).

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

Testcontainers by default will not wait until the container has stopped. It will simply issue the stop command and return immediately:

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop();
```

If you need to wait for the container to be stopped, you can provide a timeout:

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop({ timeout: 10000 }); // ms
```

Testcontainers by default will remove volumes created by the container when stopped. This behaviour can be configured:

```javascript
const container = await new GenericContainer("postgres").start();
await container.stop({ removeVolumes: false });
```

## Restarting a container

Restarting a container:

```javascript
const container = await new GenericContainer("alpine").start();
await container.restart();
```

## Reusing a container

Enabling container reuse, note that two containers are considered equal if their options (exposed ports, commands, mounts, etc) match. This also works across multiple processes:

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

You can provide the ports you want to expose from the container:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(22, 80, 443)
  .start();
```

Testcontainers will automatically bind an available, random port on the host to each exposed port. This is to avoid port conflicts when running tests quickly or in parallel.

You can retrieve the mapped port as follows:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts(80)
  .start();

const httpPort = container.getMappedPort(80);
```

Though not recommended, you can provide fixed ports:

```javascript
const container = await new GenericContainer("alpine")
  .withExposedPorts({
    container: 80,
    host: 80
  })
  .start();
```

## Running commands

Execute commands inside a running container:

```javascript
const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

## Streaming logs

Stream logs from a running container:
```javascript
const container = await new GenericContainer("alpine").start();

(await container.logs())
  .on("data", line => console.log(line))
  .on("err", line => console.error(line))
  .on("end", () => console.log("Stream closed"));
```
