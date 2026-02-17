# Compose

## Starting a Docker compose environment

Create and start a Docker Compose environment:

```js
const { DockerComposeEnvironment } = require("testcontainers");

const composeFilePath = "/path/to/build-context";
const composeFile = "docker-compose.yml";

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
```

You can override by providing [multiple compose files](https://docs.docker.com/compose/extends/#multiple-compose-files):

```js
const environment = await new DockerComposeEnvironment(
  composeFilePath, 
  [
    composeFile1, 
    composeFile2
  ]
);
```

Provide a list of service names to only start those services:

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up(["redis", "postgres"]);
```

### With wait strategy

`withWaitStrategy` expects **container names**, not service names. With Docker Compose v2, the default container name for the first replica is usually `<service>-1`.

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withWaitStrategy("redis-1", Wait.forLogMessage("Ready to accept connections"))
  .withWaitStrategy("postgres-1", Wait.forHealthCheck())
  .up(["redis", "postgres"]);
```

### With a default wait strategy

By default Testcontainers uses the "listening ports" wait strategy for all containers. If you'd like to override
the default wait strategy for all services, you can do so:

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withDefaultWaitStrategy(Wait.forHealthCheck())
  .up();
```

### With a pull policy

Testcontainers will automatically pull an image if it doesn't exist. This is configurable:

```js
const { DockerComposeEnvironment, PullPolicy } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withPullPolicy(PullPolicy.alwaysPull())
  .up();
```

Create a custom pull policy:

```ts
const { GenericContainer, ImagePullPolicy } = require("testcontainers");

class CustomPullPolicy implements ImagePullPolicy {
  public shouldPull(): boolean {
    return true;
  }
}

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withPullPolicy(new CustomPullPolicy())
  .up();
```

### With rebuild

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withBuild()
  .up();
```

### With environment file

See [environment file](https://docs.docker.com/compose/environment-variables/#using-the---env-file--option).

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironmentFile(".env.custom")
  .up();
```

### With profiles

See [profiles](https://docs.docker.com/compose/profiles/).

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withProfiles("profile1", "profile2")
  .up();
```

### With no recreate

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withNoRecreate()
  .up();
```

### With environment

Bind environment variables to the docker-compose file:

```yaml
services:
  redis:
    image: redis:${TAG}
```

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironment({ "TAG": "VALUE" })
  .up();
```

### With custom project name

See [project name](https://docs.docker.com/compose/project-name/).

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withProjectName("test")
  .up();
```

### With custom client options

See [docker-compose](https://github.com/PDMLab/docker-compose/) library.

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withClientOptions({ executable: { standalone: true, executablePath: "/path/to/docker-compose" } })
  .up();
```


## Downing a Docker compose environment

Testcontainers by default will not wait until the environment has downed. It will simply issue the down command and return immediately. This is to save time when running tests.

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down();
```

If you need to wait for the environment to be downed, you can provide a timeout:

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down({ timeout: 10_000 }); // 10 seconds
```

Volumes created by the environment are removed when stopped. This is configurable:

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down({ removeVolumes: false });
```

## Stopping a Docker compose environment

If you have multiple docker-compose environments which share dependencies such as networks, you can stop the environment instead of downing it:

```js
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.stop();
```

## Interacting with the containers

Interact with the containers in your compose environment as you would any other Generic Container. Compose-managed container names use the `<service-name>-<index>` format.

```js
const container = environment.getContainer("alpine-1");
```
