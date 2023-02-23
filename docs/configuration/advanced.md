# Advanced

### Docker

- `DOCKER_HOST=tcp://docker:2375` Sets the URL of the docker daemon
- `DOCKER_TLS_VERIFY=1` When set to `1`, enables TLS communication with the docker
  daemon
- `DOCKER_CERT_PATH=/some/path` Configures the path to the `ca.pem`, `cert.pem`, and `key.pem` files used for TLS
  verification
- `DOCKER_CONFIG=/some/path` Configures the path to the `config.json`
- `TESTCONTAINERS_HOST_OVERRIDE=docker.svc.local` Docker's host on which ports are exposed
- `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` Path to Docker's socket. Used by [ryuk](#ryuk) and
  other [auxiliary containers](#auxiliary-containers) that need to perform Docker actions


### Testcontainers

- `TESTCONTAINERS_RYUK_PRIVILEGED=true` Run [ryuk](#ryuk) as a privileged container
- `TESTCONTAINERS_RYUK_DISABLED=true` Disable [ryuk](#ryuk)
- `TESTCONTAINERS_RYUK_PORT=65515` Explicitly set [ryuk](#ryuk) host port (not recommended)
- `TESTCONTAINERS_SSHD_PORT=65515` Explicitly set [SSHd](#SSHd) host port (not recommended)
- `RYUK_CONTAINER_IMAGE=registry.mycompany.com/mirror/ryuk:0.3.0` Custom image for [ryuk](#ryuk)
- `SSHD_CONTAINER_IMAGE=registry.mycompany.com/mirror/sshd:1.0.0` Custom image for [SSHd](#SSHd)



Testcontainers may need to create auxiliary containers to provide its functionality.

To avoid Docker pull limits, you can host your own images and use them by setting the appropriate environment variables:

| Container | Environment Variable   | Default                     |
|-----------|------------------------|-----------------------------|
| ryuk      | `RYUK_CONTAINER_IMAGE` | `testcontainers/ryuk:0.3.4` |
| SSHd      | `SSHD_CONTAINER_IMAGE` | `testcontainers/sshd:1.1.0` |
