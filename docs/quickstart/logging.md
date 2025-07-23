# Logging

Testcontainers writes logs using the [debug](https://www.npmjs.com/package/debug) library. This allows you to enable or disable logs at runtime, and to filter logs by namespace.

The following namespaces are available:

- `testcontainers*`: Show all logs
- `testcontainers`: Show Testcontainers core logs
- `testcontainers:containers`: Show logs from containers
- `testcontainers:compose`: Show logs from Docker Compose
- `testcontainers:build`: Show build logs
- `testcontainers:pull`: Show image pull logs
- `testcontainers:exec`: Show container execution logs

!!! note
    You can enable multiple loggers: `DEBUG=testcontainers,testcontainers:exec.`

---

You could for example run your tests with all Testcontainers logs enabled like this:

```bash
DEBUG=testcontainers* npm test
```
