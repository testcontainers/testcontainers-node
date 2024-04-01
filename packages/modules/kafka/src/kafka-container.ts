import {
  AbstractStartedContainer,
  BoundPorts,
  Content,
  GenericContainer,
  InspectResult,
  RandomUuid,
  StartedTestContainer,
  Uuid,
  Wait,
  WaitStrategy,
  getContainerRuntimeClient,
  waitForContainer,
} from "testcontainers";

const KAFKA_PORT = 9093;
const KAFKA_BROKER_PORT = 9092;
const KAFKA_CONTROLLER_PORT = 9094;
const DEFAULT_ZOOKEEPER_PORT = 2181;
const DEFAULT_CLUSTER_ID = "4L6g3nShT-eMCtK--X86sw";
const STARTER_SCRIPT = "/testcontainers_start.sh";
const WAIT_FOR_SCRIPT_MESSAGE = "Waiting for script...";

// https://docs.confluent.io/platform/7.0.0/release-notes/index.html#ak-raft-kraft
const MIN_KRAFT_VERSION = "7.0.0";
const MIN_KRAFT_SASL_VERSION = "7.5.0";

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

enum KafkaMode {
  EMBEDDED_ZOOKEEPER,
  PROVIDED_ZOOKEEPER,
  KRAFT,
}

export class KafkaContainer extends GenericContainer {
  private readonly uuid: Uuid = new RandomUuid();

  private mode = KafkaMode.EMBEDDED_ZOOKEEPER;
  private zooKeeperHost?: string;
  private zooKeeperPort?: number;
  private saslSslConfig?: SaslSslListenerOptions;
  private originalWaitinStrategy: WaitStrategy;

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
    this.originalWaitinStrategy = this.waitStrategy;
  }

  public withZooKeeper(host: string, port: number): this {
    this.mode = KafkaMode.PROVIDED_ZOOKEEPER;
    this.zooKeeperHost = host;
    this.zooKeeperPort = port;

    return this;
  }

  public withKraft(): this {
    this.verifyMinKraftVersion();
    this.mode = KafkaMode.KRAFT;
    this.zooKeeperHost = undefined;
    this.zooKeeperPort = undefined;
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

    if (this.mode === KafkaMode.PROVIDED_ZOOKEEPER) {
      this.withEnvironment({ KAFKA_ZOOKEEPER_CONNECT: `${this.zooKeeperHost}:${this.zooKeeperPort}` });
    } else if (this.mode === KafkaMode.EMBEDDED_ZOOKEEPER) {
      this.zooKeeperHost = this.uuid.nextUuid();
      this.zooKeeperPort = DEFAULT_ZOOKEEPER_PORT;
      this.withExposedPorts(this.zooKeeperPort);
      this.withEnvironment({ KAFKA_ZOOKEEPER_CONNECT: `localhost:${this.zooKeeperPort}` });
    } else {
      // Kraft
      this.withEnvironment({
        CLUSTER_ID: DEFAULT_CLUSTER_ID,
        KAFKA_NODE_ID: this.environment["KAFKA_BROKER_ID"],
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
          this.environment["KAFKA_LISTENER_SECURITY_PROTOCOL_MAP"] + ",CONTROLLER:PLAINTEXT",
        KAFKA_LISTENERS: `${this.environment["KAFKA_LISTENERS"]},CONTROLLER://0.0.0.0:${KAFKA_CONTROLLER_PORT}`,
        KAFKA_PROCESS_ROLES: "broker,controller",
        KAFKA_CONTROLLER_QUORUM_VOTERS: `${this.environment["KAFKA_BROKER_ID"]}@${network}:${KAFKA_CONTROLLER_PORT}`,
        KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER",
      });
    }

    // Change the wait strategy to wait for a log message from a fake starter script
    // so that we can put a real starter script in place at that moment
    this.originalWaitinStrategy = this.waitStrategy;
    this.waitStrategy = Wait.forLogMessage(WAIT_FOR_SCRIPT_MESSAGE);
    this.withEntrypoint(["sh"]);
    this.withCommand([
      "-c",
      `echo '${WAIT_FOR_SCRIPT_MESSAGE}'; while [ ! -f ${STARTER_SCRIPT} ]; do sleep 0.1; done; ${STARTER_SCRIPT}`,
    ]);
  }

  public override async start(): Promise<StartedKafkaContainer> {
    if (this.mode === KafkaMode.KRAFT && this.saslSslConfig && this.isLessThanCP(7, 5)) {
      throw new Error(
        `Provided Confluent Platform's version ${this.imageName.tag} is not supported in Kraft mode with sasl (must be ${MIN_KRAFT_SASL_VERSION} or above)`
      );
    }
    return new StartedKafkaContainer(await super.start());
  }

  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    let command = "#!/bin/bash\n";
    const advertisedListeners = this.updateAdvertisedListeners(container, inspectResult);
    // exporting KAFKA_ADVERTISED_LISTENERS with the container hostname
    command += `export KAFKA_ADVERTISED_LISTENERS=${advertisedListeners}\n`;

    if (this.mode !== KafkaMode.KRAFT || this.isLessThanCP(7, 4)) {
      // Optimization: skip the checks
      command += "echo '' > /etc/confluent/docker/ensure \n";
    }
    if (this.mode === KafkaMode.KRAFT) {
      if (this.saslSslConfig) {
        command += this.commandKraftCreateUser(this.saslSslConfig);
      }
      if (this.isLessThanCP(7, 4)) {
        command += this.commandKraft();
      }
    } else if (this.mode === KafkaMode.EMBEDDED_ZOOKEEPER) {
      command += this.commandZookeeper();
    }

    // Run the original command
    command += "/etc/confluent/docker/run \n";
    await container.copyContentToContainer([{ content: command, target: STARTER_SCRIPT, mode: 0o777 }]);

    const client = await getContainerRuntimeClient();
    const dockerContainer = client.container.getById(container.getId());
    const boundPorts = BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult).filter(
      this.exposedPorts
    );
    await waitForContainer(client, dockerContainer, this.originalWaitinStrategy, boundPorts);

    if (this.saslSslConfig && this.mode !== KafkaMode.KRAFT) {
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

  private updateAdvertisedListeners(container: StartedTestContainer, inspectResult: InspectResult): string {
    let advertisedListeners = `BROKER://${inspectResult.hostname}:${KAFKA_BROKER_PORT}`;

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
    advertisedListeners += `,${bootstrapServers}`;
    return advertisedListeners;
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

  private verifyMinKraftVersion() {
    if (this.isLessThanCP(7)) {
      throw new Error(
        `Provided Confluent Platform's version ${this.imageName.tag} is not supported in Kraft mode (must be ${MIN_KRAFT_VERSION} or above)`
      );
    }
  }

  private isLessThanCP(max: number, min = 0, patch = 0): boolean {
    if (this.imageName.tag === "latest") {
      return false;
    }
    const parts = this.imageName.tag.split(".");
    return !(
      parts.length > 2 &&
      (Number(parts[0]) > max ||
        (Number(parts[0]) === max &&
          (Number(parts[1]) > min || (Number(parts[1]) === min && Number(parts[2]) >= patch))))
    );
  }

  private commandKraftCreateUser(saslOptions: SaslSslListenerOptions): string {
    return (
      "echo 'kafka-storage format --ignore-formatted " +
      `-t "${this.environment["CLUSTER_ID"]}" ` +
      "-c /etc/kafka/kafka.properties " +
      `--add-scram "${saslOptions.sasl.mechanism}=[name=${saslOptions.sasl.user.name},password=${saslOptions.sasl.user.password}]"' >> /etc/confluent/docker/configure\n`
    );
  }

  private commandKraft(): string {
    let command = "sed -i '/KAFKA_ZOOKEEPER_CONNECT/d' /etc/confluent/docker/configure\n";
    command +=
      "echo 'kafka-storage format --ignore-formatted " +
      `-t "${this.environment["CLUSTER_ID"]}" ` +
      "-c /etc/kafka/kafka.properties' >> /etc/confluent/docker/configure\n";
    return command;
  }

  private commandZookeeper(): string {
    let command = "echo 'clientPort=" + DEFAULT_ZOOKEEPER_PORT + "' > zookeeper.properties\n";
    command += "echo 'dataDir=/var/lib/zookeeper/data' >> zookeeper.properties\n";
    command += "echo 'dataLogDir=/var/lib/zookeeper/log' >> zookeeper.properties\n";
    command += "zookeeper-server-start zookeeper.properties &\n";
    return command;
  }
}

export class StartedKafkaContainer extends AbstractStartedContainer {
  constructor(startedTestContainer: StartedTestContainer) {
    super(startedTestContainer);
  }
}
