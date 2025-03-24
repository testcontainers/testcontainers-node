# Quickstart

## Install

```bash
npm install testcontainers --save-dev
```

## Example

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
    container = await new GenericContainer("redis").withExposedPorts(6379).start();
    redisClient = createClient({ url: `redis://${container.getHost()}:${container.getMappedPort(6379)}` });
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

Why did it take a few seconds? Because your container runtime likely had to pull the image first. If you run the test again, it'll likely pass much faster.

It would be nice to see what Testcontainers is doing while the test is running. You can enable all debug logging by setting the `DEBUG` environment variable. For example:

```bash
DEBUG=testcontainers* npm test
```

If we run the test again, we'll see a lot of debug output:

```
[DEBUG] Checking container runtime strategy "UnixSocketStrategy"...
[TRACE] Fetching Docker info...
[TRACE] Fetching remote container runtime socket path...
[TRACE] Resolving host...
[TRACE] Fetching Compose info...
[TRACE] Looking up host IPs...
[TRACE] Initialising clients...
[TRACE] Container runtime info:
[DEBUG] Container runtime strategy "UnixSocketStrategy" works
[DEBUG] Checking if image exists "redis:latest"...
[DEBUG] Checked if image exists "redis:latest"
[DEBUG] Pulling image "redis:latest"...
[DEBUG] Executing Docker credential provider "docker-credential-desktop.exe"
[DEBUG] Auth config found for registry "https://index.docker.io/v1/": CredsStore
[redis:latest] {"status":"Pulling from library/redis","id":"latest"}
[redis:latest] {"status":"Pulling fs layer","progressDetail":{},"id":"6e909acdb790"}
...
[redis:latest] {"status":"Status: Downloaded newer image for redis:latest"}
[DEBUG] Pulled image "redis:latest"
[DEBUG] Acquiring lock file "/tmp/testcontainers-node.lock"...
[DEBUG] Acquired lock file "/tmp/testcontainers-node.lock"
[DEBUG] Listing containers...
[DEBUG] Listed containers
[DEBUG] Creating new Reaper for session "4c81d4efc176" with socket path "/var/run/docker.sock"...
[DEBUG] Checking if image exists "testcontainers/ryuk:0.11.0"...
[DEBUG] Checked if image exists "testcontainers/ryuk:0.11.0"
[DEBUG] Image "testcontainers/ryuk:0.11.0" already exists
[DEBUG] Creating container for image "testcontainers/ryuk:0.11.0"...
[DEBUG] [11a9d12ea231] Created container for image "testcontainers/ryuk:0.11.0"
[INFO] [11a9d12ea231] Starting container for image "testcontainers/ryuk:0.11.0"...
[DEBUG] [11a9d12ea231] Starting container...
[DEBUG] [11a9d12ea231] Started container
[INFO] [11a9d12ea231] Started container for image "testcontainers/ryuk:0.11.0"
[DEBUG] [11a9d12ea231] Fetching container logs...
[DEBUG] [11a9d12ea231] Demuxing stream...
[DEBUG] [11a9d12ea231] Demuxed stream
[DEBUG] [11a9d12ea231] Fetched container logs
[DEBUG] [11a9d12ea231] Waiting for container to be ready...
[DEBUG] [11a9d12ea231] Waiting for log message "/.*Started.*/"...
[DEBUG] [11a9d12ea231] Fetching container logs...
[11a9d12ea231] time=2025-03-24T12:10:17.130Z level=INFO msg=starting connection_timeout=1m0s reconnection_timeout=10s request_timeout=10s shutdown_timeout=10m0s remove_retries=10 retry_offset=-1s changes_retry_interval=1s port=8080 verbose=false
[11a9d12ea231] time=2025-03-24T12:10:17.130Z level=INFO msg=Started address=[::]:8080
[11a9d12ea231] time=2025-03-24T12:10:17.130Z level=INFO msg="client processing started"
[DEBUG] [11a9d12ea231] Demuxing stream...
[DEBUG] [11a9d12ea231] Demuxed stream
[DEBUG] [11a9d12ea231] Fetched container logs
[DEBUG] [11a9d12ea231] Log wait strategy complete
[INFO] [11a9d12ea231] Container is ready
[DEBUG] [11a9d12ea231] Connecting to Reaper (attempt 1) on "localhost:32774"...
[DEBUG] [11a9d12ea231] Connected to Reaper
[DEBUG] Releasing lock file "/tmp/testcontainers-node.lock"...
[DEBUG] Released lock file "/tmp/testcontainers-node.lock"
[DEBUG] Creating container for image "redis:latest"...
[11a9d12ea231] time=2025-03-24T12:10:17.145Z level=INFO msg="client connected" address=172.17.0.1:40446 clients=1
[11a9d12ea231] time=2025-03-24T12:10:17.145Z level=INFO msg="adding filter" type=label values="[org.testcontainers.session-id=4c81d4efc176]"
[936d82e9964e] Created container for image "redis:latest"
[936d82e9964e] Starting container for image "redis:latest"...
[936d82e9964e] Starting container...
[936d82e9964e] Started container
[936d82e9964e] Started container for image "redis:latest"
[936d82e9964e] Fetching container logs...
[936d82e9964e] Demuxing stream...
[936d82e9964e] Demuxed stream
[936d82e9964e] Fetched container logs
[936d82e9964e] Waiting for container to be ready...
[936d82e9964e] Waiting for host port 32775...
[936d82e9964e] Waiting for internal port 6379...
[936d82e9964e] 1:C 24 Mar 2025 12:10:17.419 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
[936d82e9964e] 1:C 24 Mar 2025 12:10:17.419 * Redis version=7.4.2, bits=64, commit=00000000, modified=0, pid=1, just started
[936d82e9964e] 1:C 24 Mar 2025 12:10:17.419 # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf
[936d82e9964e] 1:M 24 Mar 2025 12:10:17.419 * monotonic clock: POSIX clock_gettime
[936d82e9964e] 1:M 24 Mar 2025 12:10:17.419 * Running mode=standalone, port=6379.
[936d82e9964e] 1:M 24 Mar 2025 12:10:17.420 * Server initialized
[936d82e9964e] 1:M 24 Mar 2025 12:10:17.420 * Ready to accept connections tcp
[DEBUG] [936d82e9964e] Host port 32775 ready
[DEBUG] [936d82e9964e] Host port wait strategy complete
[DEBUG] [936d82e9964e] Internal port 6379 ready
[INFO] [936d82e9964e] Container is ready
[INFO] [936d82e9964e] Stopping container...
[DEBUG] [936d82e9964e] Stopping container...
[936d82e9964e] 1:signal-handler (1742818217) Received SIGTERM scheduling shutdown...
[DEBUG] [936d82e9964e] Stopped container
[DEBUG] [936d82e9964e] Removing container...
[DEBUG] [936d82e9964e] Removed container
[INFO] [936d82e9964e] Stopped container
```

These logs are very useful for debugging when a container isn't working as expected. You can see there are logs from the Testcontainers library, as well as logs emitted from all Testcontainers-managed containers.