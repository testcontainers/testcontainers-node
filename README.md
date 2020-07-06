# Testcontainers

> Testcontainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

![Node.js CI](https://github.com/testcontainers/testcontainers-node/workflows/Node.js%20CI/badge.svg?branch=master)
[![npm version](https://badge.fury.io/js/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)
[![npm version](https://img.shields.io/npm/dm/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)

## Install

```bash
npm i -D testcontainers
```

## Usage

Run your app with the `DEBUG=testcontainers` environment variable set to see debug output.

The following environment variables are supported:

| Key | Example value | Behaviour |
| --- | --- | --- |
| `DOCKER_HOST` | `tcp://docker:2375` | Override the Docker host, useful for DIND in CI environments |

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

## Examples

Using a pre-built Docker image:

```javascript
const redis = require("async-redis");
const { GenericContainer } = require("testcontainers");

(async () => {
  const container = await new GenericContainer("redis")
    .withExposedPorts(6379)
    .start();
  
  const redisClient = redis.createClient(
    container.getMappedPort(6379),
    container.getContainerIpAddress(),
  );
  await redisClient.quit();

  await container.stop();
})();
```

Using a specific image version:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine", "3.10")
  .start();
```

Building and using your own Docker image:

```javascript
const path = require("path");
const { GenericContainer } = require("testcontainers");

const buildContext = path.resolve(__dirname, "dir-containing-dockerfile");

const container = await GenericContainer.fromDockerfile(buildContext)
  .withBuildArg("ARG_KEY", "ARG_VALUE")
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
  .withCmd(["top"])
  .start();
```

Execute commands inside a running container:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
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
  .withBindMount("/local/file.txt", "/remote/file.txt")
  .withBindMount("/local/dir", "/remote/dir", "ro")
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

Creating a container with environment variables:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withEnv("ENV_KEY", "ENV_VALUE")
  .start();
```

Creating a container with a custom health check command. 

Note that `interval`, `timeout`, `retries` and `startPeriod` are optional; the values will be inherited from the image or parent image if omitted. Also note that the wait strategy should be set to `Wait.forHealthCheck()` for this option to take effect:

```javascript
const { GenericContainer, Wait } = require("testcontainers");
const { Duration, TemporalUnit } = require("node-duration");

const container = await new GenericContainer("alpine")
  .withHealthCheck({
    test: "curl -f http://localhost || exit 1",
    interval: new Duration(1, TemporalUnit.SECONDS),
    timeout: new Duration(3, TemporalUnit.SECONDS),
    retries: 5,
    startPeriod: new Duration(1, TemporalUnit.SECONDS)
  })
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

Creating a container that connects to a specific network:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withNetworkMode("network_name")
  .start();
```

Create user-defined bridge network and attach the container to it:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
    .start();

const container = await new GenericContainer("alpine")
  .withNetworkMode(network.getName())
  .start();

await container.stop();
await network.stop();
```

Specifying a pull policy. 

Note that if omitted will use the `DefaultPullPolicy` which will use a locally cached 
image if one already exists, this is usually the preferred option. In cases where 
there is a local image for a given tag but the remote image with the same tag may 
have changed (for example when using the `latest` tag), you can tell testcontainers 
to pull the image again by specifying an `AlwaysPullPolicy`: 

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await new GenericContainer("alpine", "latest")
  .withPullPolicy(new AlwaysPullPolicy())
  .start();
```

Pulling an image from the private registry:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("private-image")
  .withAuthentication({
    username: 'username',
    password: 'password',
    email: 'your@email.email',
    serveraddress: 'https://index.docker.io/v1'
  })
  .start();
```

Specifying a default log driver.

You can override the logging driver used by docker to be the default one (json-file).
This might be necessary when the driver of your docker host does not support reading logs
and you want to use the `Wait.forLogMessage` wait strategy. This is the same as 
[--log-driver json-file on docker run](https://docs.docker.com/config/containers/logging/configure/#configure-the-logging-driver-for-a-container).

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withDefaultLogDriver()
  .start();
```

Creating a container with privileged mode:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withPrivilegedMode()
  .start();
```

Testcontainers will wait 10 seconds for a container to stop, to override:

```javascript
const { GenericContainer } = require("testcontainers");
const { Duration, TemporalUnit } = require("node-duration");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .start();

await container.stop({ 
  timeout: new Duration(10, TemporalUnit.SECONDS) 
})
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
})
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

(async () => {
  const composeFilePath = path.resolve(__dirname, "dir-containing-docker-compose-yml");
  const composeFile = "docker-compose.yml"
  const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();

  const container = environment.getContainer("redis_1");
  
  const redisClient = redis.createClient(
    container.getMappedPort(6379),
    container.getContainerIpAddress(),
  );
  await redisClient.quit();

  await environment.down();
})();
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

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();

const container = environment.getContainer("alpine_1");
const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

## Wait Strategies

Ordinarily Testcontainers will wait for up to 60 seconds for the container's mapped network ports to start listening. 
If the default 60s timeout is not sufficient, it can be altered with the `withStartupTimeout()` method:

```javascript
const { GenericContainer } = require("testcontainers");
const { Duration, TemporalUnit } = require("node-duration");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withStartupTimeout(new Duration(100, TemporalUnit.SECONDS))
  .start();
```

### Log output

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
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
