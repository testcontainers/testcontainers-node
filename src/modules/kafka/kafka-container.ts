import { GenericContainer } from "../../generic-container/generic-container";
import { BoundPorts } from "../../bound-ports";
import { Port } from "../../port";
import { RandomUuid, Uuid } from "../../uuid";
import { StartedTestContainer } from "../..";
import { AbstractStartedContainer } from "../abstract-started-container";
import { PortGenerator, RandomUniquePortGenerator } from "../../port-generator";
import { Host } from "../../docker/types";
import { InspectResult } from "../../docker/functions/container/inspect-container";
import { dockerClient } from "../../docker/docker-client";

const KAFKA_PORT = 9093;
const KAFKA_BROKER_PORT = 9092;

export const KAFKA_IMAGE = "confluentinc/cp-kafka:5.5.4";

export class KafkaContainer extends GenericContainer {
  private readonly uuid: Uuid = new RandomUuid();
  private readonly portGenerator: PortGenerator = new RandomUniquePortGenerator();

  private isZooKeeperProvided = false;
  private zooKeeperHost?: Host;
  private zooKeeperPort?: Port;

  constructor(image = KAFKA_IMAGE) {
    super(image);

    this.withExposedPorts(KAFKA_PORT)
      .withStartupTimeout(180_000)
      .withEnv("KAFKA_LISTENERS", `PLAINTEXT://0.0.0.0:${KAFKA_PORT},BROKER://0.0.0.0:${KAFKA_BROKER_PORT}`)
      .withEnv("KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", "BROKER:PLAINTEXT,PLAINTEXT:PLAINTEXT")
      .withEnv("KAFKA_INTER_BROKER_LISTENER_NAME", "BROKER")
      .withEnv("KAFKA_BROKER_ID", "1")
      .withEnv("KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1")
      .withEnv("KAFKA_OFFSETS_TOPIC_NUM_PARTITIONS", "1")
      .withEnv("KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", "1")
      .withEnv("KAFKA_LOG_FLUSH_INTERVAL_MESSAGES", "9223372036854775807")
      .withEnv("KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", "0")
      .withEnv("KAFKA_CONFLUENT_SUPPORT_METRICS_ENABLE", "false");
  }

  public withZooKeeper(host: Host, port: Port): this {
    this.isZooKeeperProvided = true;
    this.zooKeeperHost = host;
    this.zooKeeperPort = port;

    return this;
  }

  protected async preStart(): Promise<void> {
    const network = this.networkMode && this.networkAliases.length > 0 ? this.networkAliases[0] : "localhost";
    this.withEnv("KAFKA_ADVERTISED_LISTENERS", `BROKER://${network}:${KAFKA_BROKER_PORT}`);

    let command = "#!/bin/bash\n";
    if (this.isZooKeeperProvided) {
      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `${this.zooKeeperHost}:${this.zooKeeperPort}`);
    } else {
      this.zooKeeperHost = this.uuid.nextUuid();
      this.zooKeeperPort = await this.portGenerator.generatePort();
      this.addExposedPorts(this.zooKeeperPort);
      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `localhost:${this.zooKeeperPort}`);
      command += "echo 'clientPort=" + this.zooKeeperPort + "' > zookeeper.properties\n";
      command += "echo 'dataDir=/var/lib/zookeeper/data' >> zookeeper.properties\n";
      command += "echo 'dataLogDir=/var/lib/zookeeper/log' >> zookeeper.properties\n";
      command += "zookeeper-server-start zookeeper.properties &\n";
    }

    command += "echo '' > /etc/confluent/docker/ensure \n";
    command += "/etc/confluent/docker/run \n";
    this.withCmd(["sh", "-c", command]);
  }

  public async start(): Promise<StartedKafkaContainer> {
    return new StartedKafkaContainer(await super.start());
  }

  protected async postStart(
    container: StartedTestContainer,
    inspectResult: InspectResult,
    boundPorts: BoundPorts
  ): Promise<void> {
    const brokerAdvertisedListener = `BROKER://${inspectResult.hostname}:${KAFKA_BROKER_PORT}`;
    const bootstrapServers = `PLAINTEXT://${(await dockerClient).host}:${boundPorts.getBinding(KAFKA_PORT)}`;

    const { output, exitCode } = await container.exec([
      "kafka-configs",
      "--alter",
      "--bootstrap-server",
      brokerAdvertisedListener,
      "--entity-type",
      "brokers",
      "--entity-name",
      this.env["KAFKA_BROKER_ID"],
      "--add-config",
      `advertised.listeners=[${bootstrapServers},${brokerAdvertisedListener}]`,
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
