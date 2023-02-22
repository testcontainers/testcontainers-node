# Testcontainers

> Testcontainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Node.js CI](https://github.com/testcontainers/testcontainers-node/actions/workflows/test-master.yml/badge.svg)](https://github.com/testcontainers/testcontainers-node/actions/workflows/node.js.yml)
[![Alert Status](https://sonarcloud.io/api/project_badges/measure?project=testcontainers_testcontainers-node&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=testcontainers_testcontainers-node)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=testcontainers_testcontainers-node&metric=coverage)](https://sonarcloud.io/summary/new_code?id=testcontainers_testcontainers-node)
[![npm version](https://badge.fury.io/js/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)
[![npm version](https://img.shields.io/npm/dm/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)

## Install

```bash
npm i -D testcontainers
```

## Configuration

The following environment variables are supported:

### Logs

- `DEBUG=testcontainers` Enable testcontainers logs
- `DEBUG=testcontainers:containers` Enable container logs
- `DEBUG=testcontainers:exec` Enable container exec logs
- `DEBUG=testcontainers*` Enable all logs

Note that you can enable specific loggers, e.g: `DEBUG=testcontainers,testcontainers:exec`.

### Docker

- `DOCKER_HOST=tcp://docker:2375` Sets the URL of the docker daemon
- `DOCKER_TLS_VERIFY=1` When set to `1`, enables TLS communication with the docker
  daemon
- `DOCKER_CERT_PATH=/some/path` Configures the path to the `ca.pem`, `cert.pem`, and `key.pem` files used for TLS
  verification
- `DOCKER_CONFIG=/some/path` Configures the path to the `config.json`
- `TESTCONTAINERS_HOST_OVERRIDE=docker.svc.local` Docker's host on which ports are exposed
- `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` Path to Docker's socket. Used by [ryuk](#ryuk) and
  other [auxiliary containers](#auxiliary-containers) that need to perform Docker actions

### Testcontainers

- `TESTCONTAINERS_RYUK_PRIVILEGED=true` Run [ryuk](#ryuk) as a privileged container
- `TESTCONTAINERS_RYUK_DISABLED=true` Disable [ryuk](#ryuk)
- `TESTCONTAINERS_RYUK_PORT=65515` Explicitly set [ryuk](#ryuk) host port (not recommended)
- `TESTCONTAINERS_SSHD_PORT=65515` Explicitly set [SSHd](#SSHd) host port (not recommended)
- `RYUK_CONTAINER_IMAGE=registry.mycompany.com/mirror/ryuk:0.3.0` Custom image for [ryuk](#ryuk)
- `SSHD_CONTAINER_IMAGE=registry.mycompany.com/mirror/sshd:1.0.0` Custom image for [SSHd](#SSHd)

## Modules

[Check if there already exists a pre-prepared module for your use-case.](src/modules)

## Examples

Using a pre-built Docker image, note that omitting the tag will use `latest`:

```javascript
const redis = require("async-redis");
const { GenericContainer } = require("testcontainers");

describe("GenericContainer", () => {
  let container;
  let redisClient;

  beforeAll(async () => {
    container = await new GenericContainer("redis")
      .withExposedPorts(6379)
      .start();

    redisClient = redis.createClient(
      container.getMappedPort(6379),
      container.getHost(),
    );
  });

  afterAll(async () => {
    await redisClient.quit();
    await container.stop();
  });

  it("works", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).toBe("val");
  });
});
```

Using TypeScript:

```typescript
import { 
  TestContainer, 
  StartedTestContainer, 
  StoppedTestContainer, 
  GenericContainer
} from "testcontainers";

const container: TestContainer = new GenericContainer("alpine");
const startedContainer: StartedTestContainer = await container.start();
const stoppedContainer: StoppedTestContainer = await startedContainer.stop();
```

Using a specific image version:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine:3.10")
  .start();
```

Building and using your own Docker image:

```javascript
const path = require("path");
const { GenericContainer } = require("testcontainers");

const buildContext = path.resolve(__dirname, "dir-containing-dockerfile");

const container = await GenericContainer.fromDockerfile(buildContext)
  .withBuildArgs({
    ARG_1: "ARG_VALUE_1",    
    ARG_2: "ARG_VALUE_2",    
  })
  .build();

const startedContainer = await container
  .withExposedPorts(8080)
  .start();
```

Using a custom Dockerfile name:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext, "my-dockerfile")
  .build();
```

Build the image without using the cache:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext, "my-dockerfile")
  .withCache(false)
  .build();
```

Creating a container with multiple exposed ports:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(22, 80, 443)
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

Creating a container within a network:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
  .start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

await container.stop();
await network.stop();
```

Creating a container with a network mode:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withNetworkMode("bridge")
  .start();
```

Communicate to containers on the same network via aliases:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
    .start();

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .start();

const fooContainer = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .withNetworkAliases("foo", "bar")
  .start();

expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
```

Add hostname mappings:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExtraHosts([{
    host: "foo",
    ipAddress: "10.11.12.13"
  }, {
    host: "bar",
    ipAddress: "11.12.13.14"
  }])
  .start();

expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
expect((await container.exec(["getent", "hosts", "bar"])).exitCode).toBe(0);
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

Same for images in a Dockerfile:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext)
  .withPullPolicy(new AlwaysPullPolicy())
  .build();
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

Testcontainers will not wait for a container to stop, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .start();

await container.stop({
  timeout: 10000
});
```

Testcontainers will remove associated volumes created
by the container when stopped, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .start();

await container.stop({
  removeVolumes: false
});
```

Finding a container's IP address in a given network:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
  .start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

const networkIpAddress = container.getIpAddress(network.getName());
```

[Exposing host ports to the container:](https://www.testcontainers.org/features/networking/#exposing-host-ports-to-the-container)

```javascript
const { GenericContainer, TestContainers } = require("testcontainers");
const { createServer } = require("http");

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end("hello world");
});
server.listen(8000);

await TestContainers.exposeHostPorts(8000);

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output } = await container.exec(["curl", `http://host.testcontainers.internal:8000`]);
assert(output === "hello world");
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

## Docker Compose

Testcontainers supports docker-compose. For example for the following `docker-compose.yml`:

```yaml
version: "3"

services:
  redis:
    image: redis:latest
    ports:
      - 6379
  postgres:
    image: postgres:latest
    ports:
      - 5432
```

You can start and stop the environment, and interact with its containers:

```javascript
const path = require("path");
const redis = require("async-redis");
const { DockerComposeEnvironment } = require("testcontainers");

describe("DockerComposeEnvironment", () => {
  let environment;
  let redisClient;

  beforeAll(async () => {
    const composeFilePath = path.resolve(__dirname, "dir-containing-docker-compose-yml");
    const composeFile = "docker-compose.yml";

    environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();

    const redisContainer = environment.getContainer("redis_1");
    redisClient = redis.createClient(
      redisContainer.getMappedPort(6379),
      redisContainer.getHost(),
    );
  });

  afterAll(async () => {
    await redisClient.quit();
    await environment.down();
  });

  it("works", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).toBe("val");
  });
});
```

You can supply a list of service names to only start those services:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up(["database_service", "queue_service"]);
```

Create the containers with their own wait strategies:

```javascript
const { DockerComposeEnvironment, Wait } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withWaitStrategy("redis_1", Wait.forLogMessage("Ready to accept connections"))
  .withWaitStrategy("postgres_1", Wait.forHealthCheck())
  .up();
```

Once the environment has started, you can interact with the containers as you would any other `GenericContainer`:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

const container = environment.getContainer("alpine_1");
const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

You can supply [multiple compose files](https://docs.docker.com/compose/extends/#multiple-compose-files) to support overriding:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, [composeFile1, composeFile2])
  .up();

await environment.stop();
```

If you have multiple docker-compose environments which share dependencies such as networks, you can stop the environment instead of downing it:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.stop();
```

By default, docker-compose does not re-build Dockerfiles, but you can override this behaviour:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withBuild()
  .up();
```

Specify the [environment file](https://docs.docker.com/compose/environment-variables/#using-the---env-file--option):

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withEnvFile(".env.custom")
    .up();
```

Specify [profiles](https://docs.docker.com/compose/profiles/):

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withProfiles("profile1", "profile2")
    .up();
```

Specify not to re-create containers that are already running:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withNoRecreate()
  .up();
```

Bind environment variables to the docker-compose file. For example if we have the following docker-compose file:

```yaml
services:
  redis:
    image: redis:${TAG}
```

Then we can set `TAG` as follows:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironment({ "TAG": "VALUE" })
  .up();
```

Testcontainers will not wait for an environment to down, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.down({ 
  timeout: 10000 
});
```

Testcontainers will remove associated volumes created by the environment when downed, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.down({
  removeVolumes: false
});
```

## Wait Strategies

Ordinarily Testcontainers will wait for up to 60 seconds for the container's mapped network ports to start listening.
If the default 60s timeout is not sufficient, it can be altered with the `withStartupTimeout()` method:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withStartupTimeout(120000) // wait 120s 
  .start();
```

### Log output

Plain text:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
  .start();
```

Regular expression:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage(/Listening on port [0-9]+/))
  .start();
```

### Health check

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

### HTTP

Default behaviour of waiting for a 200 response:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forHttp("/health", 8080))
  .start();
```

Specify status code:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCode(201))

.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCodeMatching(statusCode => statusCode === 201))
```

Specify response body:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forResponsePredicate(response => response === "OK"))
```

Customise the request:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .withMethod("POST")
  .withHeaders({ X_CUSTOM_VALUE: "custom" })
  .withBasicCredentials("username", "password")
  .withReadTimeout(10000))
```

Use TLS:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls())
```

Allow insecure TLS:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls()
  .insecureTls())
```

### Other Startup Strategies

If none of these options meet your requirements, you can create your own subclass of `StartupCheckStrategy`:

```javascript
const Dockerode = require("dockerode");
const { 
  GenericContainer, 
  StartupCheckStrategy,
  StartupStatus
} = require("testcontainers");

class ReadyAfterDelayWaitStrategy extends StartupCheckStrategy {
  public checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus> {
    return new Promise((resolve) => setTimeout(() => resolve("SUCCESS"), 3000));
  }
}

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(new ReadyAfterDelayWaitStrategy())
  .start();
```

## Authentication

Testcontainers will automatically pick up and use credentials from `$HOME/.docker/config.json`, using
credential helpers, credential stores, or raw auth as necessary and in that order.

## Auxiliary Containers

Testcontainers may need to create auxiliary containers to provide its functionality.

To avoid Docker pull limits, you can host your own images and use them by setting the appropriate environment variables:

| Container | Environment Variable   | Default                     |
|-----------|------------------------|-----------------------------|
| ryuk      | `RYUK_CONTAINER_IMAGE` | `testcontainers/ryuk:0.3.4` |
| SSHd      | `SSHD_CONTAINER_IMAGE` | `testcontainers/sshd:1.1.0` |

### ryuk

Testcontainers will start ryuk whenever a container, docker-compose environment or network is started.

Once started, this container keeps track of containers/images/networks/volumes created by testcontainers and will
automatically clean them up 10s after connectivity with testcontainers is lost. This is useful for example if a test
starts a container and then terminates unexpectedly, as it will be automatically removed.

ryuk by default does not run privileged, if necessary this can be overridden by setting the environment variable
`TESTCONTAINERS_RYUK_PRIVILEGED` to `true`. If necessary, ryuk can be disabled enirely by setting the environment
variable `TESTCONTAINERS_RYUK_DISABLED` to `true`.

### SSHd

Testcontainers will start SSHd when using the expose host port functionality.

Once started, any container that is created will have a host mapping of `host.testcontainers.internal` that points to
the SSHd container, as well as being connected to its network.

When we then expose a host port, we remote port forward our local port to the SSHd container, which the other
containers will then be able to access at `host.testcontainers.internal:<exposed-port>`.

## Common Issues

1. **Insufficient Docker memory**

By default, Docker sets CPU and memory limits, with a default memory limit
of 2GB. If exceeded, you will be unable to pull/run Docker images.
To see how much memory Docker has  used, you can run ```docker system info```

- To remove existing containers and images to clear some space you can run ```docker system prune```
- Alternatively you can increase the memory limit via Docker's settings under the Advanced pane.

2. **Insufficient test timeouts**

It can take a few seconds up to a few minutes to pull and run certain Docker images,
depending on file sizes and network constraints. It's unlikely that the default
timeouts set by test frameworks are sufficient.

- Increase the test timeout via the methods provided by the testing framework.
