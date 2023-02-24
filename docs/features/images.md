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

### With pull policy

Testcontainers will automatically pull an image if it doesn't exist. This is configurable:

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withPullPolicy(new AlwaysPullPolicy())
  .build();
```

### With build arguments

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withBuildArgs({
    ARG_1: "VALUE_1",    
    ARG_2: "VALUE_2",    
  })
  .build();
```

### With custom Dockerfile

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context", "my-dockerfile")
  .build();
```

### With/without cache

```javascript
const container = await GenericContainer
  .fromDockerfile("/path/to/build-context")
  .withCache(false)
  .build();
```
