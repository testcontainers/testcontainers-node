# Compose

Testcontainers supports docker-compose. For example for the following `docker-compose.yml`:

```yaml
version: "3"

services:
  redis:
    image: redis:latest
    ports:
      - 6379
  postgres:
    image: postgres:latest
    ports:
      - 5432
```

You can start and stop the environment, and interact with its containers:

```javascript
const path = require("path");
const redis = require("async-redis");
const { DockerComposeEnvironment } = require("testcontainers");

describe("DockerComposeEnvironment", () => {
  let environment;
  let redisClient;

  beforeAll(async () => {
    const composeFilePath = path.resolve(__dirname, "dir-containing-docker-compose-yml");
    const composeFile = "docker-compose.yml";

    environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();

    const redisContainer = environment.getContainer("redis_1");
    redisClient = redis.createClient(
      redisContainer.getMappedPort(6379),
      redisContainer.getHost(),
    );
  });

  afterAll(async () => {
    await redisClient.quit();
    await environment.down();
  });

  it("works", async () => {
    await redisClient.set("key", "val");
    expect(await redisClient.get("key")).toBe("val");
  });
});
```

You can supply a list of service names to only start those services:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up(["database_service", "queue_service"]);
```

Create the containers with their own wait strategies:

```javascript
const { DockerComposeEnvironment, Wait } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withWaitStrategy("redis_1", Wait.forLogMessage("Ready to accept connections"))
  .withWaitStrategy("postgres_1", Wait.forHealthCheck())
  .up();
```

Once the environment has started, you can interact with the containers as you would any other `GenericContainer`:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

const container = environment.getContainer("alpine_1");
const { output, exitCode } = await container.exec(["echo", "hello", "world"]);
```

You can supply [multiple compose files](https://docs.docker.com/compose/extends/#multiple-compose-files) to support overriding:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, [composeFile1, composeFile2])
  .up();

await environment.stop();
```

If you have multiple docker-compose environments which share dependencies such as networks, you can stop the environment instead of downing it:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.stop();
```

By default, docker-compose does not re-build Dockerfiles, but you can override this behaviour:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withBuild()
  .up();
```

Specify the [environment file](https://docs.docker.com/compose/environment-variables/#using-the---env-file--option):

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withEnvFile(".env.custom")
    .up();
```

Specify [profiles](https://docs.docker.com/compose/profiles/):

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withProfiles("profile1", "profile2")
    .up();
```

Specify not to re-create containers that are already running:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withNoRecreate()
  .up();
```

Bind environment variables to the docker-compose file. For example if we have the following docker-compose file:

```yaml
services:
  redis:
    image: redis:${TAG}
```

Then we can set `TAG` as follows:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironment({ "TAG": "VALUE" })
  .up();
```

Testcontainers will not wait for an environment to down, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.down({ 
  timeout: 10000 
});
```

Testcontainers will remove associated volumes created by the environment when downed, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up();

await environment.down({
  removeVolumes: false
});
```
