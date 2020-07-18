# Kafka

## Examples

Using the built-in ZooKeeper:

```javascript
const { Kafka } = require("kafkajs");
const { KafkaContainer } = require("testcontainers");

const container = await new KafkaContainer()
  .withExposedPorts(9093)
  .start();

const client = new Kafka({
  brokers: [`${container.getContainerIpAddress()}:${container.getMappedPort(9093)}`],
});

const producer = client.producer();
await producer.connect();
```

Providing your own ZooKeeper:

```javascript
const { Kafka } = require("kafkajs");
const { KafkaContainer, Network } = require("testcontainers");

const ZOO_KEEPER_HOST = "zookeeper";
const ZOO_KEEPER_PORT = 2181;

const network = await new Network().start();

const zooKeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper", "latest")
  .withName(ZOO_KEEPER_HOST)
  .withEnv("ZOOKEEPER_CLIENT_PORT", ZOO_KEEPER_PORT.toString())
  .withNetworkMode(network.getName())
  .withExposedPorts(ZOO_KEEPER_PORT)
  .start();

const kafkaContainer = await new KafkaContainer()
  .withNetworkMode(network.getName())
  .withZooKeeper(ZOO_KEEPER_HOST, ZOO_KEEPER_PORT)
  .withExposedPorts(9093)
  .start()
```
