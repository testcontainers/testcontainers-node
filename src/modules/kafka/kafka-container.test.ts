import { Consumer, Kafka, logLevel, Producer } from "kafkajs";
import { KafkaContainer } from "./kafka-container";
import { Network } from "../../network";
import { GenericContainer } from "../../generic-container";
import { StartedTestContainer } from "../../test-container";

describe("KafkaContainer", () => {
  jest.setTimeout(180_000);

  let managedProducers: Producer[] = [];
  let managedConsumers: Consumer[] = [];

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
  });

  it("should connect to kafka using in-built zoo-keeper", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);
  });

  it("should connect to kafka using in-build zoo-keeper and custom network", async () => {
    const network = await new Network().start();

    const kafkaContainer = await new KafkaContainer().withNetworkMode(network.getName()).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);
  });

  it("should connect to kafka using provided zoo-keeper", async () => {
    const network = await new Network().start();

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;
    await new GenericContainer("confluentinc/cp-zookeeper", "latest")
      .withName(zooKeeperHost)
      .withEnv("ZOOKEEPER_CLIENT_PORT", zooKeeperPort.toString())
      .withNetworkMode(network.getName())
      .withExposedPorts(zooKeeperPort)
      .start();

    const kafkaContainer = await new KafkaContainer()
      .withNetworkMode(network.getName())
      .withZooKeeper(zooKeeperHost, zooKeeperPort)
      .withExposedPorts(9093)
      .start();

    await testPubSub(kafkaContainer);
  });

  const testPubSub = async (kafkaContainer: StartedTestContainer) => {
    const kafka = new Kafka({
      logLevel: logLevel.NOTHING,
      brokers: [`${kafkaContainer.getContainerIpAddress()}:${kafkaContainer.getMappedPort(9093)}`],
    });

    const producer = manageProducer(kafka.producer());
    await producer.connect();

    const consumer = manageConsumer(kafka.consumer({ groupId: "test-group" }));
    await consumer.connect();

    await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

    const consumedMessage = await new Promise(async (resolve) => {
      await consumer.run({
        eachMessage: async ({ message }) => resolve(message.value?.toString()),
      });
    });

    expect(consumedMessage).toBe("test message");
  };
});
