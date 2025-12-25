import fs from "node:fs";
import path from "node:path";
import { GenericContainer, Network } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { KafkaContainer, SaslSslListenerOptions } from "./kafka-container";
import { assertMessageProducedAndConsumed } from "./test-helper";

const IMAGE = getImage(__dirname);

describe("KafkaContainer", { timeout: 240_000 }, () => {
  const certificatesDir = path.resolve(__dirname, "..", "test-certs");

  it("should connect", async () => {
    // kafkaLatestConnect {
    await using container = await new KafkaContainer(IMAGE).start();

    await assertMessageProducedAndConsumed(container);
    // }
  });

  it("should connect with custom network", async () => {
    await using network = await new Network().start();
    await using container = await new KafkaContainer(IMAGE).withNetwork(network).start();

    await assertMessageProducedAndConsumed(container);
  });

  it("should be reusable", async () => {
    await using container1 = await new KafkaContainer(IMAGE).withReuse().start();
    const container2 = await new KafkaContainer(IMAGE).withReuse().start();

    expect(container2.getId()).toBe(container1.getId());
  });

  it(`should connect with SASL`, async () => {
    // kafkaLatestSsl {
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

    await using container = await new KafkaContainer(IMAGE).withSaslSslListener(saslConfig).start();

    await assertMessageProducedAndConsumed(
      container,
      {
        brokers: [`${container.getHost()}:${container.getMappedPort(9096)}`],
        ssl: true,
        sasl: {
          mechanism: "scram-sha-512",
          username: "app-user",
          password: "userPassword",
        },
      },
      {
        "ssl.ca.location": path.resolve(certificatesDir, "kafka.client.truststore.pem"),
      }
    );
    // }
  });

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
