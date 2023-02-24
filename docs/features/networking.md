# Networking

## Creating and using a network

Create and start a new network. Start a container within the network:

```javascript
const { GenericContainer, Network } = require("testcontainers");

const network = await new Network().start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

await container.stop();
await network.stop();
```

Find a container's IP address in a given network:

```javascript
const network = await new Network().start();

const container = await new GenericContainer("alpine")
  .withNetwork(network)
  .start();

const networkIpAddress = container.getIpAddress(network.getName());
```

### With network mode

```javascript
const container = await new GenericContainer("alpine")
  .withNetworkMode("bridge")
  .start();
```

### With extra hosts

```javascript
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

## Network aliases

Network aliases are the preferred option for container communication on the same network:

```javascript
const network = await new Network().start();

const container = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .start();

const fooContainer = await new GenericContainer("alpine")
  .withCommand(["sleep", "infinity"])
  .withNetwork(network)
  .withNetworkAliases("foo")
  .start();

expect((await container.exec(["getent", "hosts", "foo"])).exitCode).toBe(0);
```

## Expose host ports to container

You can expose a host port to a container:

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

expect((await container.exec(["curl", `http://host.testcontainers.internal:8000`])).output)
  .toBe("hello world");
```

To achieve this, Testcontainers will start a SSHd container. Containers join the same network as the SSHd container and have a host mapping of `host.testcontainers.internal` pointing to it. When we expose a host port, we remote port forward our local port to the SSHd container, which other containers can access at `host.testcontainers.internal:<exposed-port>`.
