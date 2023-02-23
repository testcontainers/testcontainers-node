# Containers

Creating a container with a specific image version:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine:3.10")
  .start();
```


Creating a container with multiple exposed ports:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(22, 80, 443)
  .start();
```


Specifying an exact host port to bind to (not recommended, Testcontainers will automatically find an available port):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts({
    container: 8000,
    host: 8080
  })
  .start();
```


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

assert(container1.getId() === container2.getId());
```

Restarting a container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .start();
  
await container.restart();
```

Creating a container with a specified name:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withName("custom-container-name")
  .start();
```

Creating a container with a command:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();
```

Creating a container with entrypoint:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withEntrypoint(["cat"])
  .start();
```

Execute commands inside a running container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

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

Creating a container with a `tmpfs` mount:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
  .start();
```

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

Creating a container with a custom health check command. Note that `interval`, `timeout`, `retries` and `startPeriod` are optional; the values will be inherited from the image or parent image if omitted. Also note that the wait strategy should be set to `Wait.forHealthCheck()` for this option to take effect:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withHealthCheck({
    test: ["CMD-SHELL", "curl -f http://localhost || exit 1"],
    interval: 1000,
    timeout: 3000,
    retries: 5,
    startPeriod: 1000
  })
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

To execute the `test` in a shell use the form `["CMD-SHELL", "command"]`, for example:

```javascript
["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
```

To execute the `test` without a shell, use the form: `["CMD", "command", "arg1", "arg2"]`, for example:

```javascript
["CMD", "/usr/bin/wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/hello-world"]
```

Specifying a pull policy. Note that if omitted will use the `DefaultPullPolicy` which will use a locally cached image
if one already exists, this is usually the preferred option. In cases where there is a local image for a given tag
but the remote image with the same tag may have changed (for example when using the `latest` tag), you can tell
testcontainers to pull the image again by specifying an `AlwaysPullPolicy`:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine:latest")
  .withPullPolicy(new AlwaysPullPolicy())
  .start();
```


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

Creating and running a container with a specific user, note that the value can be a username or UID (format: `<name|uid>[:<group|gid>]`):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withUser("bob")
  .start();
```

Creating a container with privileged mode:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPrivilegedMode()
  .start();
```

Creating a container with added [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("aline")
  .withAddedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

Creating a container with dropped [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("aline")
  .withDroppedCapabilities("NET_ADMIN", "IPC_LOCK")
  .start();
```

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

Creating a container with [IPC mode](https://docs.docker.com/engine/reference/run/#ipc-settings---ipc):

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withIpcMode("host")
  .start();
```
