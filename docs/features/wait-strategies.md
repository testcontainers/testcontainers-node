# Wait Strategies

Note that the startup timeout of all wait strategies is configurable:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withStartupTimeout(120000) // wait 120s
  .start();
```

## Listening ports

The default wait strategy used by Testcontainers. It will wait up to 60 seconds for the container's mapped network ports to be bound.

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(6379)
  .start();
```

It can be set explicitly but is not required:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forListeningPorts())
  .start();
```

## Log output

Wait until the container has logged a message:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
  .start();
```

With a regular expression:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forLogMessage(/Listening on port \d+/))
  .start();
```

Wait until the container has logged a message a number of times:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forLogMessage("Listening on port 8080", 2))
  .start();
```

## Health check

Wait until the container's health check is successful:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forHealthCheck())
  .start();
```

Define your own health check:

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

Note that `interval`, `timeout`, `retries` and `startPeriod` are optional as they are inherited from the image or parent image if omitted.

To execute the test with a shell use the form `["CMD-SHELL", "command"]`:

```javascript
["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
```

To execute the test without a shell, use the form: `["CMD", "command", "arg1", "arg2"]`. This may be needed when working with distroless images:

```javascript
["CMD", "/usr/bin/wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/hello-world"]
```

## HTTP

Wait for an HTTP request to satisfy a condition. By default, it will wait for a 200 response:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withWaitStrategy(Wait.forHttp("/health", 8080))
  .start();
```

### For status code

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCode(201))

.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forStatusCodeMatching(statusCode => statusCode === 201))
```

### For response body

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .forResponsePredicate(response => response === "OK"))
```

### Custom request

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8080)
  .withMethod("POST")
  .withHeaders({ X_CUSTOM_VALUE: "custom" })
  .withBasicCredentials("username", "password")
  .withReadTimeout(10000))
```

### Use TLS

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls())
```

#### Insecure TLS

```javascript
.withWaitStrategy(Wait.forHttp("/health", 8443)
  .useTls()
  .insecureTls())
```

## Shell command

Wait until a shell command returns a successful exit code:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forSuccessfulCommand("stat /tmp/app.lock"))
  .start();
```

## Composite

Multiple wait strategies can be chained together:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withWaitStrategy(Wait.forAll([
    Wait.forListeningPorts(),
    Wait.forLogMessage("Ready to accept connections")
  ]))
  .start();
```

The composite wait strategy by default will respect each individual wait strategy's startup timeout. For example:

```javascript
const w1 = Wait.forListeningPorts().withStartupTimeout(1000);
const w2 = Wait.forLogMessage("READY").withStartupTimeout(2000);

const composite = Wait.forAll([w1, w2])

expect(w1.getStartupTimeout()).toBe(1000);
expect(w2.getStartupTimeout()).toBe(2000);
```

The startup timeout of inner wait strategies that have not defined their own startup timeout can be set by setting the startup timeout on the composite:

```javascript
const w1 = Wait.forListeningPorts().withStartupTimeout(1000);
const w2 = Wait.forLogMessage("READY");

const composite = Wait.forAll([w1, w2]).withStartupTimeout(2000)

expect(w1.getStartupTimeout()).toBe(1000);
expect(w2.getStartupTimeout()).toBe(2000);
```

The startup timeout of all wait strategies can be controlled by setting a deadline on the composite. In this case, the composite will throw unless all inner wait strategies have resolved before the deadline.

```javascript
const w1 = Wait.forListeningPorts();
const w2 = Wait.forLogMessage("READY");
const composite = Wait.forAll([w1, w2]).withDeadline(2000)
```

## Other startup strategies

If these options do not meet your requirements, you can subclass `StartupCheckStrategy` and use `Dockerode`, which is the underlying Docker client used by Testcontainers:

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

const container = await new GenericContainer("alpine")
  .withWaitStrategy(new ReadyAfterDelayWaitStrategy())
  .start();
```
