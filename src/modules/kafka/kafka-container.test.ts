import {Consumer, Kafka, logLevel, Producer} from "kafkajs";
import {KafkaContainer} from "./kafka-container";
import {Network, StartedNetwork} from "../../network";
import {GenericContainer} from "../../generic-container";
import {StartedTestContainer} from "../../test-container";

describe("KafkaContainer", () => {
  jest.setTimeout(120000);

  let managedContainers: StartedTestContainer[] = [];
  let managedNetworks: StartedNetwork[] = [];
  let managedProducers: Producer[] = [];
  let managedConsumers: Consumer[] = [];

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

  const manageConsumer = (consumer: Consumer): Consumer => {
    managedConsumers.push(consumer);
    return consumer;
  };

  afterEach(async () => {
    await Promise.all(managedProducers.map((producer) => producer.disconnect()));
    managedProducers = [];
    await Promise.all(managedConsumers.map((consumer) => consumer.disconnect()));
    managedConsumers = [];
    await Promise.all(managedContainers.map((container) => container.stop()));
    managedContainers = [];
    await Promise.all(managedNetworks.map((network) => network.stop()));
    managedNetworks = [];
  });

  it("should connect to kafka using in-built zookeeper", async () => {
    const kafkaContainer = manageContainer(
      await new KafkaContainer("confluentinc/cp-kafka", "latest", "kafka").withExposedPorts(9093).start()
    );

    await testPubSub(kafkaContainer);
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
        .withExposedPorts(zooKeeperPort)
        .start()
    );

    const kafkaContainer = manageContainer(
      await new KafkaContainer("confluentinc/cp-kafka", "latest", "kafka")
        .withNetworkMode(network.getName())
        .withZooKeeper(zooKeeperHost, zooKeeperPort)
        .withExposedPorts(9093)
        .start()
    );

    await testPubSub(kafkaContainer);
  });

  const testPubSub = async (kafkaContainer: StartedTestContainer) => {
    const kafka = new Kafka({
      logLevel: logLevel.NOTHING,
      brokers: [`${kafkaContainer.getContainerIpAddress()}:${kafkaContainer.getMappedPort(9093)}`],
    });

    const producer = manageProducer(kafka.producer());
    await producer.connect();

    const consumer = manageConsumer(kafka.consumer({ groupId: "test-group" }))
    await consumer.connect()

    await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    await consumer.subscribe({ topic: 'test-topic', fromBeginning: true })
    const consumedMessage = await new Promise(async resolve => {
      await consumer.run({
        eachMessage: async ({message}) => resolve(message.value.toString())
      })
    });

    expect(consumedMessage).toBe("test message");
  }
});
