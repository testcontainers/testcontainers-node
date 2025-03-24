# Global setup

If you have a lot of tests that require the same container, you might not want to spin up one per test.

In this case a common pattern is to set the container up globally, and reuse it in your tests. Here's an example using Vitest:

```ts
// setup.js

import { createClient, RedisClientType } from "redis";
import { GenericContainer, StartedTestContainer } from "testcontainers";

export async function setup() {
  globalThis.redisContainer = await new GenericContainer("redis")
    .withExposedPorts(6379)
    .start();
  
  globalThis.redisClient = createClient({ 
    url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}` 
  });
  
  await redisClient.connect();
}

export async function teardown() {
  await globalThis.redisClient.disconnect();
  await globalThis.redisContainer.stop();
}
```

```ts
// vite.config.js

import { defineConfig } from "vite";

export default defineConfig({
  test: {
    setupFiles: "./setup.js",
  }
});
```

And to reference the container/client in your tests:

```ts
it("should set and retrieve a value from Redis", async () => {
  await globalThis.redisClient.set("key", "test-value");
  const result = await globalThis.redisClient.get("key");
  
  expect(result).toBe("test-value");
});
```
