import { Kafka, logLevel } from "kafkajs";
import { KafkaContainer } from "./kafka-container";
import { Network } from "../../network";
import { GenericContainer } from "../../generic-container";
import { StartedTestContainer } from "../../test-container";

describe("KafkaContainer", () => {
  jest.setTimeout(180_000);

  it("should connect to kafka using in-built zoo-keeper", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect to kafka using in-built zoo-keeper and custom images", async () => {
    const kafkaContainer = await new KafkaContainer(
      "confluentinc/cp-kafka:latest",
      undefined,
      "confluentinc/cp-zookeeper:latest"
    )
      .withExposedPorts(9093)
      .start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect to kafka using in-built zoo-keeper and custom network", async () => {
    const network = await new Network().start();

    const kafkaContainer = await new KafkaContainer().withNetworkMode(network.getName()).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
    await network.stop();
  });

  it("should connect to kafka using provided zoo-keeper and network", async () => {
    const network = await new Network().start();

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;
    const zookeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper:latest")
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

    await zookeeperContainer.stop();
    await kafkaContainer.stop();
    await network.stop();
  });

  const testPubSub = async (kafkaContainer: StartedTestContainer) => {
    const kafka = new Kafka({
      logLevel: logLevel.NOTHING,
      brokers: [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`],
    });

    const producer = kafka.producer();
    await producer.connect();

    const consumer = kafka.consumer({ groupId: "test-group" });
    await consumer.connect();

    await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

    const consumedMessage = await new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => resolve(message.value?.toString()),
      });
    });

    expect(consumedMessage).toBe("test message");

    await consumer.disconnect();
    await producer.disconnect();
  };
});
