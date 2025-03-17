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
const { GenericContainer, PullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPullPolicy(PullPolicy.alwaysPull())
  .start();
```

Create a custom pull policy:

```typescript
const { GenericContainer, ImagePullPolicy } = require("testcontainers");

class CustomPullPolicy implements ImagePullPolicy {
  public shouldPull(): boolean {
    return true;
  }
}

const container = await new GenericContainer("alpine")
  .withPullPolicy(new CustomPullPolicy())
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

### With a platform

```javascript
const container = await new GenericContainer("alpine")
  .withPlatform("linux/arm64") // similar to `--platform linux/arm64`
  .start();
```

### With bind mounts

**Not recommended.**

Bind mounts are not portable. They do not work with Docker in Docker or in cases where the Docker agent is remote. It is preferred to [copy files/directories/content into the container](../containers#with-filesdirectoriescontent) instead.

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

### With files/directories/content

Copy files/directories or content to a container before it starts:

```javascript
const container = await new GenericContainer("alpine")
  .withCopyFilesToContainer([{
    source: "/local/file.txt",
    target: "/remote/file1.txt"
  }])
  .withCopyDirectoriesToContainer([{
    source: "/localdir",
    target: "/some/nested/remotedir"
  }])
  .withCopyContentToContainer([{
    content: "hello world",
    target: "/remote/file2.txt"
  }])
  .withCopyArchivesToContainer([{
    tar: nodeReadable,
    target: "/some/nested/remotedir"
  }])
  .start();
```

Or after it starts:

```javascript
const container = await new GenericContainer("alpine").start();

container.copyFilesToContainer([{
  source: "/local/file.txt",
  target: "/remote/file1.txt"
}])
container.copyDirectoriesToContainer([{
  source: "/localdir",
  target: "/some/nested/remotedir"
}])
container.copyContentToContainer([{
  content: "hello world",
  target: "/remote/file2.txt"
}])
container.copyArchiveToContainer(nodeReadable, "/some/nested/remotedir");
```

An optional `mode` can be specified in octal for setting file permissions:

```javascript
const container = await new GenericContainer("alpine")
  .withCopyFilesToContainer([{
    source: "/local/file.txt",
    target: "/remote/file1.txt",
    mode: parseInt("0644", 8)
  }])
  .withCopyDirectoriesToContainer([{
    source: "/localdir",
    target: "/some/nested/remotedir",
    mode: parseInt("0644", 8)
  }])
  .withCopyContentToContainer([{
    content: "hello world",
    target: "/remote/file2.txt",
    mode: parseInt("0644", 8)
  }])
  .start();
```

### Copy archive from container

Files and directories can be fetched from a started or stopped container as a tar archive. The archive is returned as a readable stream:

```javascript
const container = await new GenericContainer("alpine").start();
const tarArchiveStream = await container.copyArchiveFromContainer("/var/log")
```

And when a container is stopped but not removed:

```javascript
const container = await new GenericContainer("alpine").start();
const stoppedContainer = await container.stop({ remove: false });
const tarArchiveStream = await stoppedContainer.copyArchiveFromContainer("/var/log/syslog")
```

### With working directory

```javascript
const container = await new GenericContainer("alpine")
  .withWorkingDir("/opt")
  .start();
```

### With default log driver

May be necessary when the driver of your docker host does not support reading logs, and you want to use the [log output wait strategy](../wait-strategies#log-output).

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

### With shared memory size

```javascript
const container = await new GenericContainer("alpine")
  .withSharedMemorySize(512 * 1024 * 1024)
  .start();
```

### With custom hostname

**Not recommended.**

See this [Docker blog post on Testcontainers best practices](https://www.docker.com/blog/testcontainers-best-practices/#:~:text=Don't%20hardcode%20the%20hostname)

```javascript
const container = await new GenericContainer("alpine")
  .withHostname("my-hostname")
  .start();
```

## Stopping a container

Testcontainers by default will not wait until the container has stopped. It will simply issue the stop command and return immediately. This is to save time when running tests.

```javascript
const container = await new GenericContainer("alpine").start();
await container.stop();
```

If you need to wait for the container to be stopped, you can provide a timeout:

```javascript
const container = await new GenericContainer("alpine").start();
await container.stop({ timeout: 10000 }); // ms
```

You can disable automatic removal of the container, which is useful for debugging, or if for example you want to copy content from the container once it has stopped:

```javascript
const container = await new GenericContainer("alpine").start();
await container.stop({ remove: false });
```

Volumes created by the container are removed when stopped. This is configurable:

```javascript
const container = await new GenericContainer("alpine").start();
await container.stop({ removeVolumes: false });
```

## Restarting a container

```javascript
const container = await new GenericContainer("alpine").start();
await container.restart();
```

## Committing a container to an image

```javascript
const container = await new GenericContainer("alpine").start();
// Do something with the container
await container.exec(["sh", "-c", `echo 'hello world' > /hello-world.txt`]);
// Commit the container to an image
const newImageId = await container.commit({ repo: "my-repo", tag: "my-tag" });
// Use this image in a new container
const containerFromCommit = await new GenericContainer(newImageId).start();
```

By default, the image inherits the behavior of being marked for cleanup on exit. You can override this behavior using
the `deleteOnExit` option:

```javascript
const container = await new GenericContainer("alpine").start();
// Do something with the container
await container.exec(["sh", "-c", `echo 'hello world' > /hello-world.txt`]);
// Commit the container to an image; committed image will not be cleaned up on exit
const newImageId = await container.commit({ repo: "my-repo", tag: "my-tag", deleteOnExit: false });
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

Container re-use can be enabled or disabled globally by setting the `TESTCONTAINERS_REUSE_ENABLE` environment variable to `true` or `false`.
If this environment variable is not declared, the feature is enabled by default.

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

### Lifecycle callbacks

Define your own lifecycle callbacks for better control over your custom containers:

```typescript
import {
  GenericContainer,
  AbstractStartedContainer,
  StartedTestContainer,
  InspectResult
} from "testcontainers";

class CustomContainer extends GenericContainer {
  protected override async beforeContainerCreated(): Promise<void> {
    // ...
  }

  protected override async containerCreated(containerId: string): Promise<void> {
    // ...
  }

  protected override async containerStarting(
    inspectResult: InspectResult,
    reused: boolean
  ): Promise<void> {
    // ...
  }

  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    reused: boolean
  ): Promise<void> {
    // ...
  }

  public override async start(): Promise<CustomStartedContainer> {
    return new CustomStartedContainer(await super.start());
  }
}

class CustomStartedContainer extends AbstractStartedContainer {
  protected override async containerStopping(): Promise<void> {
    // ...
  }

  protected override async containerStopped(): Promise<void> {
    // ...
  }
}
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

To run a command inside an already started container, use the exec method. 
The command will be run in the container's working directory,
returning the combined output (`output`), standard output (`stdout`), standard error (`stderr`), and exit code (`exitCode`).

```javascript
const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, stdout, stderr, exitCode } = await container.exec(["echo", "hello", "world"]);
```

The following options can be provided to modify the command execution:

1. **`user`:** The user, and optionally, group to run the exec process inside the container. Format is one of: `user`, `user:group`, `uid`, or `uid:gid`.

2. **`workingDir`:** The working directory for the exec process inside the container.

3. **`env`:** A map of environment variables to set inside the container.


```javascript
const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output, stdout, stderr, exitCode } = await container.exec(["echo", "hello", "world"], {
	workingDir: "/app/src/",
	user: "1000:1000",
	env: {
		"VAR1": "enabled",
		"VAR2": "/app/debug.log",
	}
});
```



## Streaming logs

Logs can be consumed either from a started container:

```javascript
const container = await new GenericContainer("alpine").start();

(await container.logs())
  .on("data", line => console.log(line))
  .on("err", line => console.error(line))
  .on("end", () => console.log("Stream closed"));
```

Or a consumer can be provided before start. This is useful for example if your container is failing to start:

```javascript
const container = await new GenericContainer("alpine")
  .withLogConsumer(stream => {
    stream.on("data", line => console.log(line));
    stream.on("err", line => console.error(line));
    stream.on("end", () => console.log("Stream closed"));
  })
  .start();
```

You can specify a point in time as a UNIX timestamp from which you want the logs to start:

```javascript
const msInSec = 1000;
const tenSecondsAgoMs = new Date().getTime() - 10 * msInSec;
const since = tenSecondsAgoMs / msInSec;

(await container.logs({ since }))
  .on("data", line => console.log(line))
```
