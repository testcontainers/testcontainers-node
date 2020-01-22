# Testcontainers

> Testcontainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/testcontainers/testcontainers-node.svg?branch=master)](https://travis-ci.org/testcontainers/testcontainers-node)
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

Creating a container that connects to a specific network:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withNetworkMode("network_name")
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

### Log output Wait Strategy

In some situations a container's log output is a simple way to determine if it is ready or not. For example, we can 
wait for a `Ready` message in the container's logs as follows:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
  .start();
```
