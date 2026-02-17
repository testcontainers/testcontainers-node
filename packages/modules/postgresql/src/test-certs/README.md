# Test certificates

This directory contains test-only certificates for PostgreSQL SSL module tests.

To regenerate them:

```bash
cd packages/modules/postgresql/src/test-certs
bash generate-certs.sh
```

Optional: pass validity days (default is `36500`):

```bash
bash generate-certs.sh 3650
```

Generated files:

- `ca.crt`
- `server.crt`
- `server.key`
