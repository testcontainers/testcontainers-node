# Kafka

## Examples

Using the built-in ZooKeeper:

```javascript
const { Kafka } = require("kafkajs");
const { KafkaContainer, StartedKafkaContainer } = require("testcontainers");

const container: StartedKafkaContainer = await new KafkaContainer()
  .withExposedPorts(9093)
  .start();

const client = new Kafka({
  brokers: [`${container.getHost()}:${container.getMappedPort(9093)}`],
});
```

Providing your own Kafka and ZooKeeper images, note that all fields have working defaults:

```javascript
const { Kafka } = require("kafkajs");
const { KafkaContainer, StartedKafkaContainer } = require("testcontainers");

const container: StartedKafkaContainer = await new KafkaContainer(
  "confluentinc/cp-kafka:5.5.4", // Kafka image
  undefined, // Host
  "confluentinc/cp-zookeeper:5.5.4" // ZK image
)
  .withExposedPorts(9093)
  .start();

const client = new Kafka({
  brokers: [`${container.getHost()}:${container.getMappedPort(9093)}`],
});
```

Providing your own ZooKeeper:

```javascript
const { Kafka } = require("kafkajs");
const { GenericContainer, KafkaContainer, Network } = require("testcontainers");

const ZOO_KEEPER_HOST = "zookeeper";
const ZOO_KEEPER_PORT = 2181;

const network = await new Network().start();

const zooKeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper:5.5.4")
  .withName(ZOO_KEEPER_HOST)
  .withEnv("ZOOKEEPER_CLIENT_PORT", ZOO_KEEPER_PORT.toString())
  .withNetworkMode(network.getName())
  .start();

const kafkaContainer = await new KafkaContainer()
  .withNetworkMode(network.getName())
  .withZooKeeper(ZOO_KEEPER_HOST, ZOO_KEEPER_PORT)
  .withExposedPorts(9093)
  .start()
```
