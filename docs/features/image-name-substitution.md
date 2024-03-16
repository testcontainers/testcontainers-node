# Image name substitution

Testcontainers supports automatic substitution of Docker image names.

This allows replacement of an image name specified in test code with an alternative name - for example, to replace the name of a Docker Hub image dependency with an alternative hosted on a private image registry.

This is advisable to avoid Docker Hub rate limiting, and some companies will prefer this for policy reasons.

You can then configure Testcontainers to apply the prefix `registry.mycompany.com/mirror/` to every image that it tries to pull from Docker Hub. This can be done by setting the environment variable `TESTCONTAINERS_HUB_IMAGE_NAME_PREFIX=registry.mycompany.com/mirror/`.
