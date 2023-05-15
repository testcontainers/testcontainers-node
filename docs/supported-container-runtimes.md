# Supported container runtimes

## Docker

Works out of the box.

## Podman

### Usage

MacOS:
```bash
{% raw %}
export DOCKER_HOST=unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')
{% endraw %}
```

Linux:
```bash
export DOCKER_HOST=unix://${XDG_RUNTIME_DIR}/podman/podman.sock
```

### Known issues

**Resource reaper does not work on MacOS**

When running rootless, the resource reaper will not work, disable it:

```bash
export TESTCONTAINERS_RYUK_DISABLED=true
```

When running rootful, the resource reaper can be made to work by telling it to run privileged:

```bash
export TESTCONTAINERS_RYUK_PRIVILEGED=true
```

## Colima

### Usage

```bash
export DOCKER_HOST=unix://${HOME}/.colima/default/docker.sock
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

### Known issues

**Lack of IPv6 support: [https://github.com/abiosoft/colima/issues/583](https://github.com/abiosoft/colima/issues/583)**

When exposing a container port, Docker may provide an IPv4 _and_ an IPv6 binding, where the port may be different. Node versions < 18 default to resolve a hostname to an IPv4 address, while Node 18+ would default to an IPv6 address. Because Colima does not support IPv6, resolving a hostname to an IPv6 address results in connection refused.

There are 2 workarounds:

1. Disable IPv6 in your environment.
2. Run Node with flags such that it prefers IPv4:

```bash
export NODE_OPTIONS=--dns-result-order=ipv4first
```

**Port forwarding delays: [https://github.com/abiosoft/colima/issues/71](https://github.com/abiosoft/colima/issues/71)**

You have a container which binds a port, and once bound logs a message saying "Ready". You would expect to be able to connect to the port once that log message is received. However the way Colima works is it periodically checks for exposed ports, and then port forwards them. This means there can be a delay of several seconds before you can connect to the container port. Attempts to do so before the port is forwarded result in connection refused errors. This means wait strategies such as waiting for a health check or a log message are insufficient when using Colima.

Workarounds:

Use a composite wait strategy, where you can additionally wait for a port to be bound, on top of an existing wait strategy. For example:

```javascript
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withWaitStrategy(Wait.forAll([
    Wait.forListeningPorts(),
    Wait.forLogMessage("Ready to accept connections")
  ]))
  .start();
```

## Rancher Desktop

### Usage

```bash
export DOCKER_HOST=unix://${HOME}/.rd/docker.sock
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

### Known issues

**Same issues as [Colima](#colima).**
