import fs from "fs";
import path from "path";
import { GenericContainer, Network } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { KafkaContainer, SaslSslListenerOptions } from "./kafka-container";
import { testPubSub } from "./test-helper";

const IMAGE = getImage(__dirname);

describe("KafkaContainer", { timeout: 240_000 }, () => {
  const certificatesDir = path.resolve(__dirname, "..", "test-certs");

  // connect {
  it("should connect", async () => {
    const kafkaContainer = await new KafkaContainer(IMAGE).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
  });
  // }

  it("should connect with custom network", async () => {
    const network = await new Network().start();
    const kafkaContainer = await new KafkaContainer(IMAGE).withNetwork(network).withExposedPorts(9093).start();

    await testPubSub(kafkaContainer);

    await kafkaContainer.stop();
    await network.stop();
  });

  it("should be reusable", async () => {
    const originalKafkaContainer = await new KafkaContainer(IMAGE).withReuse().start();
    const newKafkaContainer = await new KafkaContainer(IMAGE).withReuse().start();

    expect(newKafkaContainer.getId()).toBe(originalKafkaContainer.getId());

    await originalKafkaContainer.stop();
  });

  // ssl {
  it(`should connect with SASL`, async () => {
    const saslConfig: SaslSslListenerOptions = {
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
    };

    const kafkaContainer = new KafkaContainer("confluentinc/cp-kafka:7.5.0").withSaslSslListener(saslConfig);
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

  it(`should connect with SASL in custom network`, async () => {
    const network = await new Network().start();

    const saslConfig: SaslSslListenerOptions = {
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
    };

    const kafkaContainer = await new KafkaContainer(IMAGE)
      .withNetwork(network)
      .withNetworkAliases("kafka")
      .withSaslSslListener(saslConfig)
      .start();

    const kafkaCliContainer = await new GenericContainer(IMAGE)
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
      "kafka-topics --create --topic test-topic --bootstrap-server kafka:9096 --command-config /etc/kafka/consumer.properties"
    );
    const { output, exitCode } = await kafkaCliContainer.exec(
      "kafka-topics --list --bootstrap-server kafka:9096 --command-config /etc/kafka/consumer.properties"
    );

    expect(exitCode).toBe(0);
    expect(output).toContain("test-topic");

    await kafkaCliContainer.stop();
    await kafkaContainer.stop();
  });
});
