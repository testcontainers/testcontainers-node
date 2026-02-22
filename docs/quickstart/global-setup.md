# Global setup

If you have many tests that require the same container, you may not want to spin up one per test.

!!! info
    There is a misconception that containers are heavyweight. 

    Sure, if your container has a slow startup time (e.g., a database, which on startup runs large migration scripts), it may be better to just start and manage one instance. But keep in mind that this limits your tests to run sequentially, and you may need to manage the state of the container between tests.

    In many cases it is far easier to start a new container for each test and run them in parallel. Of course, this depends on your specific use case.

Many popular test frameworks like Jest and Vitest support global setup and teardown scripts.

---

Here's an example which sets up a single Redis container globally, so it can be reused across tests. In this case we're using Vitest:

```ts title="setup.js"
import { createClient } from "redis";
import { RedisContainer } from "testcontainers";

export async function setup() {
  const container = await new RedisContainer("redis:8").start();
  const client = createClient({ url: container.getConnectionUrl() });
  await client.connect();
  
  globalThis.redisContainer = container;
  globalThis.redisClient = client;
}

export async function teardown() {
  await globalThis.redisClient.disconnect();
  await globalThis.redisContainer.stop();
}
```

```ts title="vite.config.js"
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globalSetup: "./setup.js",
  }
});
```

And to use the container/client in your tests:

```ts
await globalThis.redisClient.set("key", "test-value");
const result = await globalThis.redisClient.get("key");
```
