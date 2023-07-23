import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { KAFKA_IMAGE, KafkaContainer } from "./kafka-container";
import * as fs from "fs";
import * as path from "path";
import { GenericContainer, Network, StartedTestContainer } from "@testcontainers/core";

describe("KafkaContainer", () => {
  jest.setTimeout(240_000);

  // connectBuiltInZK {
  it("should connect using in-built zoo-keeper", async () => {
    const kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });
  // }

  it("should connect using in-built zoo-keeper and custom images", async () => {
    const kafkaContainer = await new KafkaContainer(KAFKA_IMAGE).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });

  it("should connect using in-built zoo-keeper and custom network", async () => {
    const network = await new Network().start();

    const kafkaContainer = await new KafkaContainer().withNetwork(network).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
    await network.stop();
  });

  // connectProvidedZK {
  it("should connect using provided zoo-keeper and network", async () => {
    const network = await new Network().start();

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;
    const zookeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper:5.5.4")
      .withNetwork(network)
      .withNetworkAliases(zooKeeperHost)
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
  // }

  it("should be reusable", async () => {
    const originalKafkaContainer = await new KafkaContainer().withReuse().start();
    const newKafkaContainer = await new KafkaContainer().withReuse().start();

    expect(newKafkaContainer.getId()).toBe(originalKafkaContainer.getId());

    await originalKafkaContainer.stop();
  });

  describe("when SASL SSL config listener provided", () => {
    const certificatesDir = path.resolve(__dirname, "..", "test-certs");

    // ssl {
    it(`should connect locally`, async () => {
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
    // }

    it(`should connect within Docker network`, async () => {
      const network = await new Network().start();

      const kafkaContainer = await new KafkaContainer()
        .withNetwork(network)
        .withNetworkAliases("kafka")
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

      const kafkaCliContainer = await new GenericContainer(KAFKA_IMAGE)
        .withNetwork(network)
        .withCommand(["bash", "-c", "echo 'START'; sleep infinity"])
        .withCopyFilesToContainer([
          {
            source: path.resolve(certificatesDir, "kafka.client.truststore.pem"),
            target: "/truststore.pem",
          },
        ])
        .withCopyContentToContainer([
          {
            content: `
              security.protocol=SASL_SSL
              ssl.truststore.location=/truststore.pem
              ssl.truststore.type=PEM
              ssl.endpoint.identification.algorithm=
              sasl.mechanism=SCRAM-SHA-512
              sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \\
                username="app-user" \\
                password="userPassword";
            `,
            target: "/etc/kafka/consumer.properties",
          },
        ])
        .start();

      await kafkaCliContainer.exec(
        "kafka-topics --create --topic test-topic --bootstrap-server kafka:9094 --command-config /etc/kafka/consumer.properties"
      );
      const { output, exitCode } = await kafkaCliContainer.exec(
        "kafka-topics --list --bootstrap-server kafka:9094 --command-config /etc/kafka/consumer.properties"
      );

      expect(exitCode).toBe(0);
      expect(output).toContain("test-topic");

      await kafkaCliContainer.stop();
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
