import {
  AbstractStartedContainer,
  Content,
  GenericContainer,
  InspectResult,
  RandomUuid,
  StartedTestContainer,
  Uuid,
} from "testcontainers";

const KAFKA_PORT = 9093;
const KAFKA_BROKER_PORT = 9092;
const DEFAULT_ZOOKEEPER_PORT = 2181;

export const KAFKA_IMAGE = "confluentinc/cp-kafka:7.2.2";

interface SaslSslListenerOptions {
  sasl: SaslOptions;
  port: number;
  keystore: PKCS12CertificateStore;
  truststore?: PKCS12CertificateStore;
}

interface SaslOptions {
  mechanism: "SCRAM-SHA-256" | "SCRAM-SHA-512";
  user: User;
}

interface User {
  name: string;
  password: string;
}

interface PKCS12CertificateStore {
  content: Content;
  passphrase: string;
}

export class KafkaContainer extends GenericContainer {
  private readonly uuid: Uuid = new RandomUuid();

  private isZooKeeperProvided = false;
  private zooKeeperHost?: string;
  private zooKeeperPort?: number;
  private saslSslConfig?: SaslSslListenerOptions;

  constructor(image = KAFKA_IMAGE) {
    super(image);

    this.withExposedPorts(KAFKA_PORT).withStartupTimeout(180_000).withEnvironment({
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "BROKER:PLAINTEXT,PLAINTEXT:PLAINTEXT",
      KAFKA_INTER_BROKER_LISTENER_NAME: "BROKER",
      KAFKA_BROKER_ID: "1",
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: "1",
      KAFKA_OFFSETS_TOPIC_NUM_PARTITIONS: "1",
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: "1",
      KAFKA_LOG_FLUSH_INTERVAL_MESSAGES: "9223372036854775807",
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: "0",
      KAFKA_CONFLUENT_SUPPORT_METRICS_ENABLE: "false",
    });
  }

  public withZooKeeper(host: string, port: number): this {
    this.isZooKeeperProvided = true;
    this.zooKeeperHost = host;
    this.zooKeeperPort = port;

    return this;
  }

  withSaslSslListener(options: SaslSslListenerOptions) {
    this.saslSslConfig = options;
    return this;
  }

  protected override async beforeContainerCreated(): Promise<void> {
    const network = this.networkMode && this.networkAliases.length > 0 ? this.networkAliases[0] : "localhost";
    this.withEnvironment({ KAFKA_ADVERTISED_LISTENERS: `BROKER://${network}:${KAFKA_BROKER_PORT}` });

    if (this.saslSslConfig) {
      this.addPlaintextAndSecureListener(this.saslSslConfig);
    } else {
      this.addPlaintextListener();
    }

    let command = "#!/bin/bash\n";
    if (this.isZooKeeperProvided) {
      this.withEnvironment({ KAFKA_ZOOKEEPER_CONNECT: `${this.zooKeeperHost}:${this.zooKeeperPort}` });
    } else {
      this.zooKeeperHost = this.uuid.nextUuid();
      this.zooKeeperPort = DEFAULT_ZOOKEEPER_PORT;
      this.withExposedPorts(this.zooKeeperPort);
      this.withEnvironment({ KAFKA_ZOOKEEPER_CONNECT: `localhost:${this.zooKeeperPort}` });
      command += "echo 'clientPort=" + this.zooKeeperPort + "' > zookeeper.properties\n";
      command += "echo 'dataDir=/var/lib/zookeeper/data' >> zookeeper.properties\n";
      command += "echo 'dataLogDir=/var/lib/zookeeper/log' >> zookeeper.properties\n";
      command += "zookeeper-server-start zookeeper.properties &\n";
    }

    command += "echo '' > /etc/confluent/docker/ensure \n";
    command += "/etc/confluent/docker/run \n";
    this.withCommand(["sh", "-c", command]);
  }

  public override async start(): Promise<StartedKafkaContainer> {
    return new StartedKafkaContainer(await super.start());
  }

  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    await this.updateAdvertisedListeners(container, inspectResult);
    if (this.saslSslConfig) {
      await this.createUser(container, this.saslSslConfig.sasl);
    }
  }

  private addPlaintextAndSecureListener({ port, sasl, keystore, truststore }: SaslSslListenerOptions) {
    this.withEnvironment({
      KAFKA_LISTENERS: `SECURE://0.0.0.0:${port},PLAINTEXT://0.0.0.0:${KAFKA_PORT},BROKER://0.0.0.0:${KAFKA_BROKER_PORT}`,
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "BROKER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SECURE:SASL_SSL",
      KAFKA_SSL_PROTOCOL: "TLSv1.2",
      KAFKA_SSL_KEYSTORE_LOCATION: "/etc/kafka/secrets/server.keystore.pfx",
      KAFKA_SSL_KEYSTORE_PASSWORD: keystore.passphrase,
      KAFKA_SSL_KEYSTORE_TYPE: "PKCS12",
      KAFKA_SASL_ENABLED_MECHANISMS: sasl.mechanism,
      [`KAFKA_LISTENER_NAME_SECURE_${sasl.mechanism}_SASL_JAAS_CONFIG`]:
        "org.apache.kafka.common.security.scram.ScramLoginModule required;",
    })
      .withCopyContentToContainer([{ content: keystore.content, target: "/etc/kafka/secrets/server.keystore.pfx" }])
      .withExposedPorts(KAFKA_PORT, port);

    if (truststore) {
      this.withCopyContentToContainer([
        { content: truststore.content, target: "/etc/kafka/secrets/server.truststore.pfx" },
      ]).withEnvironment({
        KAFKA_SSL_TRUSTSTORE_LOCATION: "/etc/kafka/secrets/server.truststore.pfx",
        KAFKA_SSL_TRUSTSTORE_PASSWORD: truststore.passphrase,
        KAFKA_SSL_TRUSTSTORE_TYPE: "PKCS12",
      });
    }
  }

  private addPlaintextListener() {
    this.withEnvironment({
      KAFKA_LISTENERS: `PLAINTEXT://0.0.0.0:${KAFKA_PORT},BROKER://0.0.0.0:${KAFKA_BROKER_PORT}`,
    }).withExposedPorts(KAFKA_PORT);
  }

  private async updateAdvertisedListeners(container: StartedTestContainer, inspectResult: InspectResult) {
    const brokerAdvertisedListener = `BROKER://${inspectResult.hostname}:${KAFKA_BROKER_PORT}`;

    let bootstrapServers = `PLAINTEXT://${container.getHost()}:${container.getMappedPort(KAFKA_PORT)}`;
    if (this.saslSslConfig) {
      if (this.networkMode) {
        bootstrapServers = `${bootstrapServers},SECURE://${inspectResult.hostname}:${this.saslSslConfig.port}`;
      } else {
        bootstrapServers = `${bootstrapServers},SECURE://${container.getHost()}:${container.getMappedPort(
          this.saslSslConfig.port
        )}`;
      }
    }

    const { output, exitCode } = await container.exec([
      "kafka-configs",
      "--alter",
      "--bootstrap-server",
      brokerAdvertisedListener,
      "--entity-type",
      "brokers",
      "--entity-name",
      this.environment["KAFKA_BROKER_ID"],
      "--add-config",
      `advertised.listeners=[${bootstrapServers},${brokerAdvertisedListener}]`,
    ]);

    if (exitCode !== 0) {
      throw new Error(`Kafka container configuration failed with exit code ${exitCode}: ${output}`);
    }
  }

  private async createUser(container: StartedTestContainer, { user: { name, password }, mechanism }: SaslOptions) {
    const { output, exitCode } = await container.exec([
      "kafka-configs",
      "--alter",
      // At the time of writing kafka-configs displays a warning stating that the 'zookeeper' flag is deprecated in favor of 'bootstrap-server'.
      // Unfortunately, 'bootstrap-server' can only be used to set quotas and not to create a user.
      "--zookeeper",
      this.environment["KAFKA_ZOOKEEPER_CONNECT"],
      "--entity-type",
      "users",
      "--entity-name",
      `${name}`,
      "--add-config",
      `${mechanism}=[password=${password}]`,
    ]);

    if (exitCode !== 0) {
      throw new Error(`Kafka container configuration failed with exit code ${exitCode}: ${output}`);
    }
  }
}

export class StartedKafkaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }
}
