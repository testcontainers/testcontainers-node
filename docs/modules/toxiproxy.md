# Toxiproxy Module

Testcontainers module for Shopify's [Toxiproxy](https://github.com/Shopify/toxiproxy). 
This TCP proxy can be used to simulate network failure conditions.

You can simulate network failures:

* between NodeJS code and containers, ideal for testing resilience features of client code
* between containers, for testing resilience and emergent behaviour of multi-container systems
* if desired, between NodeJS code/containers and external resources (non-Dockerized!), for scenarios where not all dependencies can be/have been dockerized

Testcontainers Toxiproxy support allows resilience features to be easily verified as part of isolated dev/CI testing. This allows earlier testing of resilience features, and broader sets of failure conditions to be covered.

## Install
```bash
npm install @testcontainers/toxiproxy --save-dev
```
 
## Usage example

A Toxiproxy container can be placed in between test code and a container, or in between containers.
In either scenario, it is necessary to create a `ToxiProxyContainer` instance on the same Docker network.

Next, it is necessary to instruct Toxiproxy to start proxying connections.
Each `ToxiProxyContainer` can proxy to many target containers if necessary.

A proxy is created by calling `createProxy` on the `ToxiProxyContainer` instance.

The client connecting to the proxied endpoint then needs to use the exposed port from the returned proxy.

All of this is done as follows:
<!--codeinclude-->
[Creating, starting and using the container:](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:create_proxy
<!--/codeinclude-->

!!! note
    Currently, `ToxiProxyContainer` will reserve 31 ports, starting at 8666. After this, trying to create a new proxy instance will throw an error.


Having done all of this, it is possible to trigger failure conditions ('Toxics') through the `proxy.instance.addToxic<TPClient.TOXIC_TYPE>()` object:

`TPClient` is the internal `toxiproxy-node-client` re-exported in this package.

* `bandwidth` - Limit a connection to a maximum number of kilobytes per second.
* `latency` - Add a delay to all data going through the proxy. The delay is equal to `latency +/- jitter`.
* `slicer` - Slices TCP data up into small bits, optionally adding a delay between each sliced "packet".
* `slow_close` - Delay the TCP socket from closing until `delay` milliseconds has elapsed.
* `timeout` - Stops all data from getting through, and closes the connection after `timeout`. If `timeout` is `0`, the connection won't close, and data will be delayed until the toxic is removed.
* `limit_data` - Closes connection when transmitted data exceeded limit.
* `reset_peer` - Simulate TCP RESET (Connection reset by peer) on the connections

Please see the [Toxiproxy documentation](https://github.com/Shopify/toxiproxy#toxics) and the [toxiproxy-node-client](https://github.com/ihsw/toxiproxy-node-client) for full details on the available Toxics.

As one example, we can introduce latency and random jitter to proxied connections as follows:

<!--codeinclude-->
[Adding latency to a connection](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:adding_toxic
<!--/codeinclude-->

There is also a helper method to enable / disable specific proxy instances (for more fine-grained control instead of using the `reset_peer` toxic). This can also be done by calling the `proxy.instance.update` method, however it is more complicated as you'll need to supply the upstream again and the internal listening port.

<!--codeinclude-->
[Enable and disable the proxy:](../../packages/modules/toxiproxy/src/toxiproxy-container.test.ts) inside_block:enabled_disabled
<!--/codeinclude-->

## Acknowledgements

This module was inspired by the Java implementation, and under the hood uses the [toxiproxy-node-client](https://github.com/ihsw/toxiproxy-node-client).
