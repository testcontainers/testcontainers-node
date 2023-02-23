### ryuk

Testcontainers will start ryuk whenever a container, docker-compose environment or network is started.

Once started, this container keeps track of containers/images/networks/volumes created by testcontainers and will
automatically clean them up 10s after connectivity with testcontainers is lost. This is useful for example if a test
starts a container and then terminates unexpectedly, as it will be automatically removed.

ryuk by default does not run privileged, if necessary this can be overridden by setting the environment variable
`TESTCONTAINERS_RYUK_PRIVILEGED` to `true`. If necessary, ryuk can be disabled enirely by setting the environment
variable `TESTCONTAINERS_RYUK_DISABLED` to `true`.
