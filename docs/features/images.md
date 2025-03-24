# Images

## Building an image

Build and start your own Docker image:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .build();

const startedContainer = await container.start();
```

Images are built by default with a randomly generated name and are deleted on exit. If you wish to keep the built images between test runs, you can provide a name and specify not to delete the image:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .build("my-custom-image", { deleteOnExit: false });
```

### With buildkit

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withBuildkit()
  .build();
```

### With a pull policy

Testcontainers will automatically pull an image if it doesn't exist. This is configurable:

```javascript
const { GenericContainer, PullPolicy } = require("testcontainers");

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withPullPolicy(PullPolicy.alwaysPull())
  .build();
```

Create a custom pull policy:

```typescript
const { GenericContainer, ImagePullPolicy } = require("testcontainers");

class CustomPullPolicy implements ImagePullPolicy {
  public shouldPull(): boolean {
    return true;
  }
}

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withPullPolicy(new CustomPullPolicy())
  .build();
```

### With build arguments

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withBuildArgs({ ARG: "VALUE" })
  .build();
```

### With target

Stop the build at a specific stage by specifying a target:

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withTarget('my-stage')
  .build();
```

### With custom Dockerfile

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context", "my-dockerfile")
  .build();
```

### Without cache

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withCache(false)
  .build();
```

### With platform

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withPlatform("linux/amd64")
  .build();
```

## Image name substitution

Testcontainers supports automatic substitution of Docker image names.

This allows replacement of an image name specified in test code with an alternative name - for example, to replace the name of a Docker Hub image dependency with an alternative hosted on a private image registry.

This is advisable to avoid Docker Hub rate limiting, and some companies will prefer this for policy reasons.

You can then configure Testcontainers to apply the prefix `registry.mycompany.com/mirror/` to every image that it tries to pull from Docker Hub. This can be done by setting the environment variable `TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX=registry.mycompany.com/mirror/`.

