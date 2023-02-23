# Troubleshooting

1. **Insufficient Docker memory**

By default, Docker sets CPU and memory limits, with a default memory limit
of 2GB. If exceeded, you will be unable to pull/run Docker images.
To see how much memory Docker has  used, you can run ```docker system info```

- To remove existing containers and images to clear some space you can run ```docker system prune```
- Alternatively you can increase the memory limit via Docker's settings under the Advanced pane.

2. **Insufficient test timeouts**

It can take a few seconds up to a few minutes to pull and run certain Docker images,
depending on file sizes and network constraints. It's unlikely that the default
timeouts set by test frameworks are sufficient.

- Increase the test timeout via the methods provided by the testing framework.
