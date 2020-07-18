import { GenericContainer } from "../generic-container";
import { BoundPorts } from "../bound-ports";
import { DockerClient } from "../docker-client";
import { Image, Tag } from "../repo-tag";
import { Network } from "../network";
import { Host } from "../docker-client-factory";
import { Port } from "../port";
import { PortClient, RandomPortClient } from "../port-client";
import { RandomUuid, Uuid } from "../uuid";

export class KafkaContainer extends GenericContainer {
  private readonly uuid: Uuid = new RandomUuid();
  private readonly portClient: PortClient = new RandomPortClient();

  private isZooKeeperProvided = false;
  private zooKeeperHost?: Host;
  private zooKeeperPort?: Port;

  constructor(readonly image: Image, readonly tag: Tag = "latest", private readonly kafkaName: string) {
    super(image, tag);
    this.withName(kafkaName)
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
      `EXTERNAL_LISTENER://${dockerClient.getHost()}:${kafkaInternalPort},BROKER://${this.kafkaName}:${kafkaBrokerPort}`
    );

    if (this.isZooKeeperProvided) {
      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `${this.zooKeeperHost}:${this.zooKeeperPort}`);
    } else {
      const network = await new Network().start();
      const zooKeeperHost = this.uuid.nextUuid();
      const zooKeeperPort = await this.portClient.getPort();

      const zookeeperContainer = await new GenericContainer("confluentinc/cp-zookeeper", "latest")
        .withName(zooKeeperHost)
        .withEnv("ZOOKEEPER_CLIENT_PORT", zooKeeperPort.toString())
        .withNetworkMode(network.getName())
        .withExposedPorts(zooKeeperPort)
        .start();

      this.sidecarContainers.push(zookeeperContainer);

      this.withNetworkMode(network.getName());
      this.withEnv("KAFKA_ZOOKEEPER_CONNECT", `${zooKeeperHost}:${zooKeeperPort}`);
    }
  }
}
