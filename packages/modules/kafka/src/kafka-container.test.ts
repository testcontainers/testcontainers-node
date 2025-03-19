import * as fs from "fs";
import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import * as path from "path";
import { GenericContainer, Network, StartedTestContainer } from "testcontainers";
import { KafkaContainer, KAFKA_IMAGE } from "./kafka-container";

describe("KafkaContainer", { timeout: 240_000 }, () => {
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

  describe.each([
    {
      name: "and zookpeer enabled",
      configure: () => ({}),
    },
    {
      name: "and kraft enabled",
      configure: (kafkaContainer: KafkaContainer) => kafkaContainer.withKraft(),
    },
  ])("when SASL SSL config listener provided $name", ({ configure }) => {
    const certificatesDir = path.resolve(__dirname, "..", "test-certs");

    // ssl {
    it(`should connect locally`, async () => {
      const kafkaContainer = await new KafkaContainer("confluentinc/cp-kafka:7.5.0").withSaslSslListener({
        port: 9096,
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
      });
      configure(kafkaContainer);
      const startedKafkaContainer = await kafkaContainer.start();

      await testPubSub(startedKafkaContainer, {
        brokers: [`${startedKafkaContainer.getHost()}:${startedKafkaContainer.getMappedPort(9096)}`],
        sasl: {
          username: "app-user",
          password: "userPassword",
          mechanism: "scram-sha-512",
        },
        ssl: {
          ca: [fs.readFileSync(path.resolve(certificatesDir, "kafka.client.truststore.pem"))],
        },
      });
      await startedKafkaContainer.stop();
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

  // connectKraft {
  it("should connect using kraft", async () => {
    const kafkaContainer = await new KafkaContainer().withKraft().withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });
  // }

  it("should throw an error when using kraft and and confluence platfom below 7.0.0", async () => {
    expect(() => new KafkaContainer("confluentinc/cp-kafka:6.2.14").withKraft()).toThrow(
      "Provided Confluent Platform's version 6.2.14 is not supported in Kraft mode (must be 7.0.0 or above)"
    );
  });

  it("should connect using kraft and custom network", async () => {
    const network = await new Network().start();
    const kafkaContainer = await new KafkaContainer().withKraft().withNetwork(network).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
    await network.stop();
  });

  it("should throw an error when using kraft wit sasl and confluence platfom below 7.5.0", async () => {
    const kafkaContainer = new KafkaContainer("confluentinc/cp-kafka:7.4.0")
      .withKraft()
      .withExposedPorts(9093)
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
          content: "fake",
          passphrase: "serverKeystorePassword",
        },
        truststore: {
          content: "fake",
          passphrase: "serverTruststorePassword",
        },
      });
    await expect(() => kafkaContainer.start()).rejects.toThrow(
      "Provided Confluent Platform's version 7.4.0 is not supported in Kraft mode with sasl (must be 7.5.0 or above)"
    );
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
