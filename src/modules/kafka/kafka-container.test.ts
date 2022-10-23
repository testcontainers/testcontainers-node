import { jest } from "@jest/globals";
import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { KAFKA_IMAGE, KafkaContainer } from "./kafka-container.js";
import { Network } from "../../network.js";
import { GenericContainer } from "../../generic-container/generic-container.js";
import { StartedTestContainer } from "../../test-container.js";
import * as fs from "fs";
import * as path from "path";

describe("KafkaContainer", () => {
  jest.setTimeout(240_000);

  it("should connect to kafka using in-built zoo-keeper", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect to kafka using in-built zoo-keeper and custom images", async () => {
    const kafkaContainer = await new KafkaContainer(KAFKA_IMAGE).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect to kafka using in-built zoo-keeper and custom network", async () => {
    const network = await new Network().start();

    const kafkaContainer = await new KafkaContainer().withNetwork(network).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
    await network.stop();
  });

  it("should connect to kafka using provided zoo-keeper and network", async () => {
    const network = await new Network().start();

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;
    const zookeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper:5.5.4")
      .withNetwork(network)
      .withNetworkAliases("zookeeper")
      .withEnvironment({ ZOOKEEPER_CLIENT_PORT: zooKeeperPort.toString() })
      .withExposedPorts(zooKeeperPort)
      .start();

    const kafkaContainer = await new KafkaContainer()
      .withNetwork(network)
      .withZooKeeper(zooKeeperHost, zooKeeperPort)
      .withExposedPorts(9093)
      .start();

    await testPubSub(kafkaContainer);

    await zookeeperContainer.stop();
    await kafkaContainer.stop();
    await network.stop();
  });

  it("should be reusable", async () => {
    const originalKafkaContainer = await new KafkaContainer().withReuse().start();
    const newKafkaContainer = await new KafkaContainer().withReuse().start();

    expect(newKafkaContainer.getId()).toBe(originalKafkaContainer.getId());

    await originalKafkaContainer.stop();
  });

  describe("when a set of certificates is provided", () => {
    const certificatesDir = path.resolve("src", "modules", "kafka", "test-certs");

    it(`should expose SASL_SSL listener if configured`, async () => {
      const kafkaContainer = await new KafkaContainer()
        .withSaslSslListener({
          port: 9094,
          sasl: {
            mechanism: "SCRAM-SHA-512",
            user: {
              name: "app-user",
              password: "userPassword",
            },
          },
          keystore: {
            content: fs.readFileSync(path.resolve(certificatesDir, "kafka.server.keystore.pfx")),
            passphrase: "serverKeystorePassword",
          },
          truststore: {
            content: fs.readFileSync(path.resolve(certificatesDir, "kafka.server.truststore.pfx")),
            passphrase: "serverTruststorePassword",
          },
        })
        .start();

      await testPubSub(kafkaContainer, {
        brokers: [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9094)}`],
        sasl: {
          username: "app-user",
          password: "userPassword",
          mechanism: "scram-sha-512",
        },
        ssl: {
          ca: [fs.readFileSync(path.resolve(certificatesDir, "kafka.client.truststore.pem"))],
        },
      });
      await kafkaContainer.stop();
    });
  });

  const testPubSub = async (kafkaContainer: StartedTestContainer, additionalConfig: Partial<KafkaConfig> = {}) => {
    const kafka = new Kafka({
      logLevel: logLevel.NOTHING,
      brokers: [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`],
      ...additionalConfig,
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
