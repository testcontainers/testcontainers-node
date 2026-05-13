# Global setup

If you have many tests that require the same container, you may not want to spin up one per test.

!!! info
    There is a misconception that containers are heavyweight.

    Sure, if your container has a slow startup time (e.g., a database, which on startup runs large migration scripts), it may be better to just start and manage one instance. But keep in mind that this limits your tests to run sequentially, and you may need to manage the state of the container between tests.

    In many cases it is far easier to start a new container for each test and run them in parallel. Of course, this depends on your specific use case.

Many popular test frameworks like Jest and Vitest support global setup and teardown scripts.

---

Here's an example which sets up a single Redis container globally, so it can be reused across tests. In this case we're using Vitest:

```js title="setup.js"
import { RedisContainer } from "@testcontainers/redis";

let redisContainer;

export async function setup(project) {
  redisContainer = await new RedisContainer("redis:8").start();
  project.provide("redisUrl", redisContainer.getConnectionUrl());
}

export async function teardown() {
  await redisContainer?.stop();
}
```

```js title="vitest.config.js"
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./setup.js",
  },
});
```

`globalSetup` runs in a different global scope than test files. To share data with tests, provide serializable values in setup and read them with `inject`:

```js
import { afterAll, beforeAll, expect, inject, test } from "vitest";
import { createClient } from "redis";

const redisClient = createClient({ url: inject("redisUrl") });

beforeAll(async () => {
  await redisClient.connect();
});

afterAll(async () => {
  await redisClient.disconnect();
});

test("stores and reads a value", async () => {
  await redisClient.set("key", "test-value");
  const result = await redisClient.get("key");
  expect(result).toBe("test-value");
});
```
