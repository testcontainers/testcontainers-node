# Logging

Logging is enabled by setting the `DEBUG` environment variable.

---

Enable **core** logs:

```bash
DEBUG=testcontainers
```

Enable **container** logs:

```bash
DEBUG=testcontainers:containers
```

Enable **container exec** logs:

```bash
DEBUG=testcontainers:exec
```

Enable **all** logs:

```bash
DEBUG=testcontainers*
```

Note that you can enable **multiple** loggers: 

```bash
DEBUG=testcontainers,testcontainers:exec
```