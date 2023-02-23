# Wait Strategies

Ordinarily Testcontainers will wait for up to 60 seconds for the container's mapped network ports to start listening.
If the default 60s timeout is not sufficient, it can be altered with the `withStartupTimeout()` method:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withStartupTimeout(120000) // wait 120s 
  .start();
```

### Log output

Plain text:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
  .start();
```

Regular expression:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forLogMessage(/Listening on port [0-9]+/))
  .start();
```

### Health check

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

### HTTP

Default behaviour of waiting for a 200 response:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forHttp("/health", 8080))
  .start();
```

Specify status code:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCode(201))

.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCodeMatching(statusCode => statusCode === 201))
```

Specify response body:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forResponsePredicate(response => response === "OK"))
```

Customise the request:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .withMethod("POST")
  .withHeaders({ X_CUSTOM_VALUE: "custom" })
  .withBasicCredentials("username", "password")
  .withReadTimeout(10000))
```

Use TLS:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls())
```

Allow insecure TLS:

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls()
  .insecureTls())
```

### Other Startup Strategies

If none of these options meet your requirements, you can create your own subclass of `StartupCheckStrategy`:

```javascript
const Dockerode = require("dockerode");
const { 
  GenericContainer, 
  StartupCheckStrategy,
  StartupStatus
} = require("testcontainers");

class ReadyAfterDelayWaitStrategy extends StartupCheckStrategy {
  public checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus> {
    return new Promise((resolve) => setTimeout(() => resolve("SUCCESS"), 3000));
  }
}

const container = await new GenericContainer("redis")
  .withExposedPorts(6379)
  .withWaitStrategy(new ReadyAfterDelayWaitStrategy())
  .start();
```
