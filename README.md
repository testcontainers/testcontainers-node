# TestContainers

> TestContainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/cristianrgreco/testcontainers-node.svg?branch=master)](https://travis-ci.org/cristianrgreco/testcontainers-node)

## Install

```bash
npm i -D testcontainers
```

## Usage

Run your app with the `DEBUG=testcontainers` env variable set to see debug output.

## Example

```javascript
const redis = require("async-redis");
const { GenericContainer } = require("testcontainers");

(async () => {
  const container = await new GenericContainer("redis")
    .withExposedPorts(6379)
    .start();

  const redisClient = redis.createClient(container.getMappedPort(6379));
  await redisClient.quit();

  await container.stop();
})();
```
