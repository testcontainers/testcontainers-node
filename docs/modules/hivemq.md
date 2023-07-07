# HiveMQ MQTT Module

This module allows automatic start up of [HiveMQ's](https://www.hivemq.com/) docker container within
Jest suites, to enable programmatic testing of JavaScript based MQTT client applications.

## Resources

* [Community forum](https://community.hivemq.com/)
* [HiveMQ website](https://www.hivemq.com/)
* [MQTT Essentials](https://www.hivemq.com/mqtt-essentials/)
* [MQTT 5 Essentials](https://www.hivemq.com/mqtt-5/)

Please make sure to check out the hivemq-docs for the [Community Edition](https://github.com/hivemq/hivemq-community-edition/wiki/).

!!! Info
    We are working to support the HiveMQ Enterprise Edition as outlined in the [Java Test Containers Module](https://java.testcontainers.org/modules/hivemq/).

## Examples

<!--codeinclude-->
[Connect with a mqtt.js client to HiveMQ](../../src/modules/hivemq/hivemq-container.test.ts) inside_block:connect
<!--/codeinclude-->
