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
