import { GenericContainer } from "../../generic-container";
import { BoundPorts } from "../../bound-ports";
import { DockerClient } from "../../docker-client";
import { Image, Tag } from "../../repo-tag";
import { Network, StartedNetwork } from "../../network";
import { Host } from "../../docker-client-instance";
import { Port } from "../../port";
import { PortClient, RandomPortClient } from "../../port-client";
import { RandomUuid, Uuid } from "../../uuid";
import { StartedTestContainer, StoppedTestContainer } from "../..";
import { StopOptions } from "../../test-container";
import { log } from "../../logger";
import { AbstractStartedContainer } from "../abstract-started-container";

export class KafkaContainer extends GenericContainer {
  private readonly uuid: Uuid = new RandomUuid();
  private readonly portClient: PortClient = new RandomPortClient();

  private isZooKeeperProvided = false;
  private zooKeeperHost?: Host;
  private zooKeeperPort?: Port;

  private network?: StartedNetwork;
  private zooKeeperContainer?: StartedTestContainer;

  constructor(
    image = "confluentinc/cp-kafka:latest",
    private readonly host?: Host,
    private readonly zooKeeperImage = "confluentinc/cp-zookeeper:latest"
  ) {
    super(image);
    this.host = host === undefined ? this.uuid.nextUuid() : host;
    this.withName(this.host)
      .withEnv(
        "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP",
        "BROKER:PLAINTEXT,EXTERNAL_LISTENER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
      )
      .withEnv("KAFKA_INTER_BROKER_LISTENER_NAME", "BROKER")
      .withEnv("KAFKA_BROKER_ID", "1")
      .withEnv("KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1")
      .withEnv("KAFKA_CONFLUENT_SUPPORT_METRICS_ENABLE", "false");
  }

  public withZooKeeper(host: Host, port: Port): this {
    this.isZooKeeperProvided = true;
    this.zooKeeperHost = host;
    this.zooKeeperPort = port;
    return this;
  }

  protected async preCreate(dockerClient: DockerClient, boundPorts: BoundPorts): Promise<void> {
    const kafkaPort = 9093;
    const kafkaInternalPort = boundPorts.getBinding(9093);
    const kafkaBrokerPort = 9092;

    this.withEnv("KAFKA_LISTENERS", `EXTERNAL_LISTENER://0.0.0.0:${kafkaPort},BROKER://0.0.0.0:${kafkaBrokerPort}`);
    this.withEnv(
      "KAFKA_ADVERTISED_LISTENERS",
      `EXTERNAL_LISTENER://${dockerClient.getHost()}:${kafkaInternalPort},BROKER://${this.host}:${kafkaBrokerPort}`
    );

    if (this.isZooKeeperProvided) {
      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `${this.zooKeeperHost}:${this.zooKeeperPort}`);
    } else {
      const zooKeeperHost = this.uuid.nextUuid();
      const zooKeeperPort = await this.portClient.getPort();

      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `${zooKeeperHost}:${zooKeeperPort}`);

      const zookeeperContainer = await new GenericContainer(this.zooKeeperImage)
        .withName(zooKeeperHost)
        .withEnv("ZOOKEEPER_CLIENT_PORT", zooKeeperPort.toString());

      if (this.networkMode !== undefined) {
        zookeeperContainer.withNetworkMode(this.networkMode);
      } else {
        this.network = await new Network().start();
        this.withNetworkMode(this.network.getName());
        zookeeperContainer.withNetworkMode(this.network.getName());
      }

      this.zooKeeperContainer = await zookeeperContainer.start();
    }
  }

  public async start(): Promise<StartedKafkaContainer> {
    return new StartedKafkaContainer(await super.start(), this.network, this.zooKeeperContainer);
  }
}

export class StartedKafkaContainer extends AbstractStartedContainer {
  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly network?: StartedNetwork,
    private readonly zooKeeperContainer?: StartedTestContainer
  ) {
    super(startedTestContainer);
  }

  public async stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
    log.debug("Stopping Kafka container");
    const stoppedContainer = await super.stop(options);
    if (this.zooKeeperContainer) {
      log.debug("Stopping ZooKeeper container");
      await this.zooKeeperContainer.stop(options);
    }
    if (this.network) {
      log.debug("Stopping Kafka network");
      await this.network.stop();
    }
    return stoppedContainer;
  }
}
