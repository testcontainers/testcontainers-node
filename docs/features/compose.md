# Compose

**Note:** Compose currently uses docker-compose (v1). If you are having problems see the [Troubleshooting](#Troubleshooting) section below

## Starting a Docker compose environment

Create and start a Docker Compose environment:

```javascript
const { DockerComposeEnvironment } = require("testcontainers");

const composeFilePath = "/path/to/build-context";
const composeFile = "docker-compose.yml";

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
```

You can override by providing [multiple compose files](https://docs.docker.com/compose/extends/#multiple-compose-files):

```javascript
const environment = await new DockerComposeEnvironment(
  composeFilePath, 
  [
    composeFile1, 
    composeFile2
  ]
);
```

Provide a list of service names to only start those services:

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .up(["redis-1", "postgres-1"]);
```

### With wait strategy

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withWaitStrategy("redis-1", Wait.forLogMessage("Ready to accept connections"))
  .withWaitStrategy("postgres-1", Wait.forHealthCheck())
  .up();
```

### With a pull policy

```javascript
const { DockerComposeEnvironment, AlwaysPullPolicy } = require("testcontainers");

const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withPullPolicy(new AlwaysPullPolicy())
  .up();
```

### With rebuild

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withBuild()
  .up();
```

### With environment file

See [environment file](https://docs.docker.com/compose/environment-variables/#using-the---env-file--option).

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironmentFile(".env.custom")
  .up();
```

### With profiles

See [profiles](https://docs.docker.com/compose/profiles/).

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withProfiles("profile1", "profile2")
  .up();
```

### With no recreate

```javascript
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

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
  .withEnvironment({ "TAG": "VALUE" })
  .up();
```

## Downing a Docker compose environment

Testcontainers by default will not wait until the environment has downed. It will simply issue the down command and return immediately. This is to save time when running tests.

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down();
```

If you need to wait for the environment to be downed, you can provide a timeout:

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down({ timeout: 10000 }); // ms
```

Volumes created by the environment are removed when stopped. This is configurable:

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.down({ removeVolumes: false });
```

## Stopping a Docker compose environment

If you have multiple docker-compose environments which share dependencies such as networks, you can stop the environment instead of downing it:

```javascript
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
await environment.stop();
```

## Interacting with the containers

Interact with the containers in your compose environment as you would any other Generic Container. Note that the container name suffix has changed from `_` to `-` between docker-compose v1 and v2 respectively.

```javascript
const container = environment.getContainer("alpine-1");
```

## Troubleshooting
Compose currently uses docker-compose (v1) (see https://docs.docker.com/compose/migrate/). If you are using docker compose (v2), then a workaround is to download [docker-compose v1 standalone](https://docs.docker.com/compose/install/standalone/) and override `process.env.PATH` so it takes precedence over your local installation. Example:

Download standalone version in a local folder:
```bash
mkdir bin
curl -SL https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-linux-x86_64 -o ./bin/docker-compose
```

Then before using DockerComposeEnvironment setup PATH:
```javascript
process.env.PATH=`${__dirname}/bin:${process.env.PATH}`;
const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
```
