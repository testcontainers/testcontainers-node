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


Creating a container with a custom health check command. Note that `interval`, `timeout`, `retries` and `startPeriod` are optional; the values will be inherited from the image or parent image if omitted. Also note that the wait strategy should be set to `Wait.forHealthCheck()` for this option to take effect:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withHealthCheck({
    test: ["CMD-SHELL", "curl -f http://localhost || exit 1"],
    interval: 1000,
    timeout: 3000,
    retries: 5,
    startPeriod: 1000
  })
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

To execute the `test` in a shell use the form `["CMD-SHELL", "command"]`, for example:

```javascript
["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
```

To execute the `test` without a shell, use the form: `["CMD", "command", "arg1", "arg2"]`, for example:

```javascript
["CMD", "/usr/bin/wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/hello-world"]
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
