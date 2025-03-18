# Configuration

All possible environment variable configurations for Testcontainers are found here.

## Logs

| Variable | Example                   | Description                |
| -------- | ------------------------- | -------------------------- |
| DEBUG    | testcontainers\*          | Enable all logs            |
| DEBUG    | testcontainers            | Enable testcontainers logs |
| DEBUG    | testcontainers:containers | Enable container logs      |
| DEBUG    | testcontainers:compose    | Enable compose logs        |
| DEBUG    | testcontainers:build      | Enable build logs          |
| DEBUG    | testcontainers:pull       | Enable pull logs           |
| DEBUG    | testcontainers:exec       | Enable container exec logs |

Note that you can enable multiple loggers, e.g: `DEBUG=testcontainers,testcontainers:exec`.

## Docker

Configuration of the Docker daemon:

| Variable           | Example                                                                    | Description                                                                             |
| ------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| DOCKER_HOST        | tcp://docker:2375                                                          | Set the URL of the docker daemon                                                        |
| DOCKER_TLS_VERIFY  | 1                                                                          | Enable/disable TLS communication with the docker daemon                                 |
| DOCKER_CERT_PATH   | /some/path                                                                 | Configures the path to the files used for TLS verification                              |
| DOCKER_CONFIG      | /some/path                                                                 | Configures the path to the config.json file for authentication                          |
| DOCKER_AUTH_CONFIG | `{"auths":{"https://registry.example.com":{"username":"","password":""}}}` | JSON string representation of the config.json file, takes precedence for authentication |

## Testcontainers

Configuration of Testcontainers and its behaviours:

| Variable                              | Example                    | Description                              |
| ------------------------------------- | -------------------------- | ---------------------------------------- |
| TESTCONTAINERS_HOST_OVERRIDE          | tcp://docker:2375          | Docker's host on which ports are exposed |
| TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE | /var/run/docker.sock       | Path to Docker's socket used by ryuk     |
| TESTCONTAINERS_RYUK_PRIVILEGED        | true                       | Run ryuk as a privileged container       |
| TESTCONTAINERS_RYUK_DISABLED          | true                       | Disable ryuk                             |
| TESTCONTAINERS_RYUK_PORT              | 65515                      | Set ryuk host port (not recommended)     |
| TESTCONTAINERS_SSHD_PORT              | 65515                      | Set SSHd host port (not recommended)     |
| TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX  | mycompany.com/registry     | Set default image registry               |
| RYUK_CONTAINER_IMAGE                  | testcontainers/ryuk:0.11.0 | Custom image for ryuk                    |
| SSHD_CONTAINER_IMAGE                  | testcontainers/sshd:1.1.0  | Custom image for SSHd                    |
| TESTCONTAINERS_REUSE_ENABLE           | true                       | Enable reusable containers               |
