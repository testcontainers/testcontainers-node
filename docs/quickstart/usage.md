# Usage

**As an example, let's spin up and test a Redis container.**

---

First, install the dependencies:

```bash
npm install testcontainers --save-dev
npm install redis
```

---

Next, we'll write a test that starts a Redis container, connects to it, and performs an operation:

```ts hl_lines="2 5 9-11 14 22"
import { createClient, RedisClientType } from "redis";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("Redis", () => {
  let container: StartedTestContainer;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    container = await new GenericContainer("redis:8")
      .withExposedPorts(6379)
      .start();
    
    redisClient = createClient({ 
      url: `redis://${container.getHost()}:${container.getMappedPort(6379)}` 
    });
    
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
    await container.stop();
  });

  it("works", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).toBe("val");
  });
});
```

Run the test, and after a few seconds, it passes!

!!! note
    Why did it take a few seconds? 
    
    Because your container runtime first had to pull the image. If you run the test again, it'll run faster.

---

The complexity of configuring a container varies. 

For Redis, it's pretty simple, we just expose a port. But for example, to define a `GenericContainer` for PostgreSQL, you'd need to configure multiple ports, environment variables for credentials, custom wait strategies, and more. For this reason there exists a catalogue of [pre-defined modules](https://testcontainers.com/modules/), which abstract away this complexity. 

If a module exists for the container you want to use, it's highly recommended to use it.

For example, using the [Redis module](../modules/redis.md), the example above can be simplified:

```bash
npm install @testcontainers/redis --save-dev
```

```ts hl_lines="2 5 9-10"
import { createClient, RedisClientType } from "redis";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";

describe("Redis", () => {
  let container: StartedRedisContainer;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    container = await new StartedRedisContainer("redis:8").start();
    redisClient = createClient({ url: container.getConnectionUrl() });
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
    await container.stop();
  });

  it("works", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).toBe("val");
  });
});
```
