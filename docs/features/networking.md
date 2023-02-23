# Networking

Creating a container within a network:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
  .start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

await container.stop();
await network.stop();
```

Creating a container with a network mode:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withNetworkMode("bridge")
  .start();
```

Communicate to containers on the same network via aliases:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
    .start();

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .start();

const fooContainer = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .withNetworkAliases("foo", "bar")
  .start();

expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
```

Add hostname mappings:

```javascript
const { GenericContainer } = require("testcontainers");

const container = await new GenericContainer("alpine")
  .withExtraHosts([{
    host: "foo",
    ipAddress: "10.11.12.13"
  }, {
    host: "bar",
    ipAddress: "11.12.13.14"
  }])
  .start();

expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
expect((await container.exec(["getent", "hosts", "bar"])).exitCode).toBe(0);
```

Finding a container's IP address in a given network:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network()
  .start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

const networkIpAddress = container.getIpAddress(network.getName());
```

[Exposing host ports to the container:](https://www.testcontainers.org/features/networking/#exposing-host-ports-to-the-container)

```javascript
const { GenericContainer, TestContainers } = require("testcontainers");
const { createServer } = require("http");

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end("hello world");
});
server.listen(8000);

await TestContainers.exposeHostPorts(8000);

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .start();

const { output } = await container.exec(["curl", `http://host.testcontainers.internal:8000`]);
assert(output === "hello world");
```

### SSHd

Testcontainers will start SSHd when using the expose host port functionality.

Once started, any container that is created will have a host mapping of `host.testcontainers.internal` that points to
the SSHd container, as well as being connected to its network.

When we then expose a host port, we remote port forward our local port to the SSHd container, which the other
containers will then be able to access at `host.testcontainers.internal:<exposed-port>`.
