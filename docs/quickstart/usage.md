# Usage

As an example, let's spin up and test a Redis container.

First, let's install the dependencies:

```bash
npm install redis
```

Using your favorite testing library, let's now create a test:

```ts
import { createClient, RedisClientType } from "redis";
import { GenericContainer, StartedTestContainer } from "testcontainers";

describe("Redis", () => {
  let container: StartedTestContainer;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    container = await new GenericContainer("redis")
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

Why did it take a few seconds? Because your container runtime likely had to pull the image first. If you run the test again, it'll run faster.
