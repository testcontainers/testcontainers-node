# Test certificates

This directory contains example certificates that are used to verify that a SASL_SSL listener can be set up.
You can use the files to configure the Kafka container and the client, 
or use provided Dockerfile to generate certificates to use in your test cases.
To use it, run:

```bash
docker build -t certs .
docker run -v "$(pwd)":/var/output certs
```

1. You may need to delete the existing certs first:

```bash
rm ca-* cert-* kafka.*
```

2. The resultant files may owned by root. Chown them to your user:

```bash
sudo chown <user>:<group> *
```