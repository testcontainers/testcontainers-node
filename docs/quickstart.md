# Quickstart

The generic container support offered by Testcontainers offers the greatest flexibility and makes it easy to use virtually any container image in the context of a temporary test environment.

In this example we will spin up a Redis container. Note that omitting the tag will use `latest`:

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

Use a specific version of the image:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine:3.10")
  .start();
```

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
