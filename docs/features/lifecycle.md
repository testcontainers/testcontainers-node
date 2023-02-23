# Lifecycle

Testcontainers will not wait for a container to stop, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .start();

await container.stop({
  timeout: 10000
});
```

Testcontainers will remove associated volumes created
by the container when stopped, to override:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("postgres")
  .withExposedPorts(5432)
  .start();

await container.stop({
  removeVolumes: false
});
```
