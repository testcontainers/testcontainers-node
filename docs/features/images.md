# Images

Building and using your own Docker image:

```javascript
const path = require("path");
const { GenericContainer } = require("testcontainers");

const buildContext = path.resolve(__dirname, "dir-containing-dockerfile");

const container = await GenericContainer.fromDockerfile(buildContext)
  .withBuildArgs({
    ARG_1: "ARG_VALUE_1",    
    ARG_2: "ARG_VALUE_2",    
  })
  .build();

const startedContainer = await container
  .withExposedPorts(8080)
  .start();
```

Using a custom Dockerfile name:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext, "my-dockerfile")
  .build();
```

Build the image without using the cache:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext, "my-dockerfile")
  .withCache(false)
  .build();
```

TODO explain image pull policy

```javascript
const { GenericContainer, AlwaysPullPolicy } = require("testcontainers");

const container = await GenericContainer.fromDockerfile(buildContext)
  .withPullPolicy(new AlwaysPullPolicy())
  .build();
```