# Testcontainers

> Testcontainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/testcontainers/testcontainers-node.svg?branch=master)](https://travis-ci.org/testcontainers/testcontainers-node)
[![npm version](https://badge.fury.io/js/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)
[![npm version](https://img.shields.io/npm/dt/testcontainers.svg)](https://www.npmjs.com/package/testcontainers)

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


## Examples

Using a pre-built Docker image:

```javascript
const redis = require("async-redis");
const { GenericContainer } = require("testcontainers");

(async () => {
  const container = await new GenericContainer("redis")
      .withEnv("KEY", "VALUE")
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

Building and using your own Docker image:

```javascript
const { GenericContainer } = require("testcontainers");

(async () => {
  const context = "/src";
  const src = ["Dockerfile", "index.js"];
  const imageName = "my-custom-image";
  const tag = "1.0.0";
  
  const container = await GenericContainer.fromDockerfile(imageName, tag, context, src);
  
  const startedContainer = await container
      .withEnv("KEY", "VALUE")
      .withExposedPorts(8080)
      .start();

  await startedContainer.stop();
})();
```
