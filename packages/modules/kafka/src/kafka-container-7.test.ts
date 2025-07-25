import fs from "fs";
import path from "path";
import { GenericContainer, Network } from "testcontainers";
import { KafkaContainer } from "./kafka-container";
import { assertMessageProducedAndConsumed } from "./test-helper";

const IMAGE = "confluentinc/cp-kafka:7.9.1";

describe("KafkaContainer", { timeout: 240_000 }, () => {
  it("should connect using in-built zoo-keeper", async () => {
    // connectBuiltInZK {
    await using container = await new KafkaContainer(IMAGE).start();
    await assertMessageProducedAndConsumed(container);
    // }
  });

  it("should connect using in-built zoo-keeper and custom images", async () => {
    await using container = await new KafkaContainer(IMAGE).start();

    await assertMessageProducedAndConsumed(container);
  });

  it("should connect using in-built zoo-keeper and custom network", async () => {
    await using network = await new Network().start();

    await using container = await new KafkaContainer(IMAGE).withNetwork(network).start();

    await assertMessageProducedAndConsumed(container);
  });

  it("should connect using provided zoo-keeper and network", async () => {
    // connectProvidedZK {
    await using network = await new Network().start();

    const zooKeeperHost = "zookeeper";
    const zooKeeperPort = 2181;

    await using _ = await new GenericContainer("confluentinc/cp-zookeeper:5.5.4")
      .withNetwork(network)
      .withNetworkAliases(zooKeeperHost)
      .withEnvironment({ ZOOKEEPER_CLIENT_PORT: zooKeeperPort.toString() })
      .withExposedPorts(zooKeeperPort)
      .start();

    await using container = await new KafkaContainer(IMAGE)
      .withNetwork(network)
      .withZooKeeper(zooKeeperHost, zooKeeperPort)
      .start();
    // }

    await assertMessageProducedAndConsumed(container);
  });

  it("should be reusable", async () => {
    await using container1 = await new KafkaContainer(IMAGE).withReuse().start();
    const container2 = await new KafkaContainer(IMAGE).withReuse().start();

    expect(container2.getId()).toBe(container1.getId());
  });

  describe("when SASL SSL config listener provided with Kraft", () => {
    const certificatesDir = path.resolve(__dirname, "..", "test-certs");

    it(`should connect locally with ZK`, async () => {
      // kafkaSsl {
      await using container = await new KafkaContainer("confluentinc/cp-kafka:7.5.0")
        .withSaslSslListener({
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
        })
        .start();

      await assertMessageProducedAndConsumed(container, {
        brokers: [`${container.getHost()}:${container.getMappedPort(9096)}`],
        sasl: {
          username: "app-user",
          password: "userPassword",
          mechanism: "scram-sha-512",
        },
        ssl: {
          ca: [fs.readFileSync(path.resolve(certificatesDir, "kafka.client.truststore.pem"))],
        },
      });
      // }
    });

    it(`should connect locally with Kraft`, async () => {
      await using container = await new KafkaContainer("confluentinc/cp-kafka:7.5.0")
        .withKraft()
        .withSaslSslListener({
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
        })
        .start();

      await assertMessageProducedAndConsumed(container, {
        brokers: [`${container.getHost()}:${container.getMappedPort(9096)}`],
        sasl: {
          username: "app-user",
          password: "userPassword",
          mechanism: "scram-sha-512",
        },
        ssl: {
          ca: [fs.readFileSync(path.resolve(certificatesDir, "kafka.client.truststore.pem"))],
        },
      });
    });

    it(`should connect within Docker network`, async () => {
      await using network = await new Network().start();

      await using _ = await new KafkaContainer(IMAGE)
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

      await using kafkaCliContainer = await new GenericContainer(IMAGE)
        .withNetwork(network)
        .withCommand(["bash", "-c", "sleep infinity"])
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
    });
  });

  it("should connect using kraft", async () => {
    // connectKraft {
    await using container = await new KafkaContainer(IMAGE).withKraft().start();
    // }

    await assertMessageProducedAndConsumed(container);
  });

  it("should throw an error when using kraft and and confluence platfom below 7.0.0", async () => {
    expect(() => new KafkaContainer("confluentinc/cp-kafka:6.2.14").withKraft()).toThrow(
      "Provided Confluent Platform's version 6.2.14 is not supported in Kraft mode (must be 7.0.0 or above)"
    );
  });

  it("should connect using kraft and custom network", async () => {
    await using network = await new Network().start();
    await using container = await new KafkaContainer(IMAGE).withKraft().withNetwork(network).start();

    await assertMessageProducedAndConsumed(container);
  });

  it("should throw an error when using kraft wit sasl and confluence platfom below 7.5.0", async () => {
    const kafkaContainer = new KafkaContainer("confluentinc/cp-kafka:7.4.0").withKraft().withSaslSslListener({
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
});
