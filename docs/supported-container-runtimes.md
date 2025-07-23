# Supported container runtimes

## Docker

Works out of the box.

---

## Podman

### Usage

#### MacOS

```bash
{% raw %}
export DOCKER_HOST=unix://$(
  podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'
)
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
{% endraw %}
```

#### Linux

Ensure the Podman socket is exposed, choose between rootless or rootful:

```bash title="Rootless"
systemctl --user status podman.socket
```

```bash title="Rootful"
sudo systemctl enable --now podman.socket
```

Export the `DOCKER_HOST`:

```bash
{% raw %}
export DOCKER_HOST=unix://$(
  podman info --format '{{.Host.RemoteSocket.Path}}'
)
{% endraw %}
```

### Known issues

**Resource reaper does not work on MacOS**

When running rootless, the resource reaper will not work, disable it:

```bash
export TESTCONTAINERS_RYUK_DISABLED=true
```

When running rootful, the resource reaper can be made to work by running it privileged:

```bash
export TESTCONTAINERS_RYUK_PRIVILEGED=true
```

---

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

The way Colima works is it periodically checks for exposed ports, and then forwards them. This means there can be a delay of several seconds before you can connect to the container port. Attempts to do so before the port is forwarded result in connection refused errors. This means wait strategies such as waiting for a health check or a log message are insufficient when using Colima.

You can use a composite wait strategy to additionally wait for a port to be bound, on top of an existing wait strategy. For example:

```javascript linenums="1"
const { GenericContainer, Wait } = require("testcontainers");

const container = await new GenericContainer("redis")
  .withWaitStrategy(Wait.forAll([
    Wait.forListeningPorts(), 
    Wait.forLogMessage("Ready to accept connections")
  ]))
  .start();
```

---

## Rancher Desktop

### Usage

```bash
export DOCKER_HOST=unix://${HOME}/.rd/docker.sock
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

### Known issues

Same issues as [Colima](#colima).
