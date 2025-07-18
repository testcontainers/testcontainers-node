import fs from "fs";
import path from "path";
import { GenericContainer, Network } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { KafkaContainer, SaslSslListenerOptions } from "./kafka-container";
import { testPubSub } from "./test-helper";

const IMAGE = getImage(__dirname);

describe("KafkaContainer", { timeout: 240_000 }, () => {
  const certificatesDir = path.resolve(__dirname, "..", "test-certs");

  // connectKafkaLatest {
  it("should connect", async () => {
    await using kafkaContainer = await new KafkaContainer(IMAGE).start();

    await testPubSub(kafkaContainer);
  });
  // }

  it("should connect with custom network", async () => {
    await using network = await new Network().start();
    await using kafkaContainer = await new KafkaContainer(IMAGE).withNetwork(network).start();

    await testPubSub(kafkaContainer);
  });

  it("should be reusable", async () => {
    await using originalKafkaContainer = await new KafkaContainer(IMAGE).withReuse().start();
    const newKafkaContainer = await new KafkaContainer(IMAGE).withReuse().start();

    expect(newKafkaContainer.getId()).toBe(originalKafkaContainer.getId());
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
    await using startedKafkaContainer = await kafkaContainer.start();

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
  });
  // }

  it(`should connect with SASL in custom network`, async () => {
    await using network = await new Network().start();

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

    await using _ = await new KafkaContainer(IMAGE)
      .withNetwork(network)
      .withNetworkAliases("kafka")
      .withSaslSslListener(saslConfig)
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
      "kafka-topics --create --topic test-topic --bootstrap-server kafka:9096 --command-config /etc/kafka/consumer.properties"
    );
    const { output, exitCode } = await kafkaCliContainer.exec(
      "kafka-topics --list --bootstrap-server kafka:9096 --command-config /etc/kafka/consumer.properties"
    );

    expect(exitCode).toBe(0);
    expect(output).toContain("test-topic");
  });
});
