# Quickstart

## Install

```bash
npm install testcontainers --save-dev
```

## Example

### JavaScript

Let's spin up and use a Redis container:

```javascript
const redis = require("async-redis");
const { GenericContainer } = require("testcontainers");

describe("Redis", () => {
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

### TypeScript

Testcontainers is built with TypeScript and offers first-class support for TypeScript users:

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
