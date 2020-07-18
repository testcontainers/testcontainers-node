import { Kafka, Producer } from "kafkajs";
import { KafkaContainer } from "./kafka-container";
import { Network, StartedNetwork } from "../../network";
import { GenericContainer } from "../../generic-container";
import { StartedTestContainer } from "../../test-container";

describe("KafkaContainer", () => {
  jest.setTimeout(120000);

  let managedContainers: StartedTestContainer[] = [];
  let managedNetworks: StartedNetwork[] = [];
  let managedProducers: Producer[] = [];

  const manageContainer = (container: StartedTestContainer): StartedTestContainer => {
    managedContainers.push(container);
    return container;
  };

  const manageNetwork = (network: StartedNetwork): StartedNetwork => {
    managedNetworks.push(network);
    return network;
  };

  const manageProducer = (producer: Producer): Producer => {
    managedProducers.push(producer);
    return producer;
  };

  afterEach(async () => {
    await Promise.all(managedProducers.map((producer) => producer.disconnect()));
    managedProducers = [];
    await Promise.all(managedContainers.map((container) => container.stop()));
    managedContainers = [];
    await Promise.all(managedNetworks.map((network) => network.stop()));
    managedNetworks = [];
  });

  it("should connect to kafka using in-built zookeeper", async () => {
    const kafkaContainer = manageContainer(
      await new KafkaContainer("confluentinc/cp-kafka", "latest", "kafka").withExposedPorts(9093).start()
    );
    const client = new Kafka({
      brokers: [`${kafkaContainer.getContainerIpAddress()}:${kafkaContainer.getMappedPort(9093)}`],
    });
    const producer = manageProducer(client.producer());
    await producer.connect();

    const result = await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    expect(result).toBeDefined();
  });

  it("should connect to kafka using provided zookeeper", async () => {
    const network = manageNetwork(await new Network().start());

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;
    manageContainer(
      await new GenericContainer("confluentinc/cp-zookeeper", "latest")
        .withName(zooKeeperHost)
        .withEnv("ZOOKEEPER_CLIENT_PORT", zooKeeperPort.toString())
        .withNetworkMode(network.getName())
        .start()
    );

    const kafkaContainer = manageContainer(
      await new KafkaContainer("confluentinc/cp-kafka", "latest", "kafka")
        .withZooKeeper(zooKeeperHost, zooKeeperPort)
        .withExposedPorts(9093)
        .withNetworkMode(network.getName())
        .start()
    );

    const client = new Kafka({
      brokers: [`${kafkaContainer.getContainerIpAddress()}:${kafkaContainer.getMappedPort(9093)}`],
    });

    const producer = manageProducer(client.producer());
    await producer.connect();

    const result = await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    expect(result).toBeDefined();
  });
});
