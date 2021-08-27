import { Kafka, logLevel } from "kafkajs";
import { KafkaContainer, KAFKA_IMAGE, ZK_IMAGE } from "./kafka-container";
import { Network } from "../../network";
import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";

describe("KafkaContainer", () => {
  jest.setTimeout(240_000);

  it("should connect to kafka using in-built zoo-keeper", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect to kafka using in-built zoo-keeper and custom images", async () => {
    const kafkaContainer = await new KafkaContainer(KAFKA_IMAGE, undefined, ZK_IMAGE).withExposedPorts(9093).start();

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
    const zookeeperContainer = await new GenericContainer(ZK_IMAGE)
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

  it("should return in-built zoo-keeper name", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    expect(kafkaContainer.getZookeeperName()).toBeDefined();

    await kafkaContainer.stop();
  });

  it("should return in-built zoo-keeper port", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    expect(kafkaContainer.getZookeeperPort()).toBeDefined();

    await kafkaContainer.stop();
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
