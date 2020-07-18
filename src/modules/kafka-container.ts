import { GenericContainer } from "../generic-container";
import { BoundPorts } from "../bound-ports";
import { DockerClient } from "../docker-client";
import { Image, Tag } from "../repo-tag";

export class KafkaContainer extends GenericContainer {
  constructor(
    readonly image: Image,
    readonly tag: Tag = "latest",
    private readonly kafkaPort: number,
    private readonly kafkaName: string,
    private readonly kafkaBrokerPort: number,
    zookeeperName: string,
    zookeeperPort: number
  ) {
    super(image, tag);
    this.kafkaPort = kafkaPort;
    this.kafkaName = kafkaName;
    this.kafkaBrokerPort = kafkaBrokerPort;
    this.withName(kafkaName)
      .withEnv("KAFKA_LISTENERS", `EXTERNAL_LISTENER://0.0.0.0:${kafkaPort},BROKER://0.0.0.0:${kafkaBrokerPort}`)
      .withEnv(
        "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP",
        "BROKER:PLAINTEXT,EXTERNAL_LISTENER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
      )
      .withEnv("KAFKA_ZOOKEEPER_CONNECT", `${zookeeperName}:${zookeeperPort}`)
      .withEnv("KAFKA_INTER_BROKER_LISTENER_NAME", "BROKER")
      .withEnv("KAFKA_BROKER_ID", "1")
      .withEnv("KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1")
      .withEnv("KAFKA_CONFLUENT_SUPPORT_METRICS_ENABLE", "false")
      .withExposedPorts(kafkaPort);
  }

  protected isCreating(dockerClient: DockerClient, boundPorts: BoundPorts): void {
    this.withEnv(
      "KAFKA_ADVERTISED_LISTENERS",
      `EXTERNAL_LISTENER://${dockerClient.getHost()}:${boundPorts.getBinding(this.kafkaPort)},BROKER://${
        this.kafkaName
      }:${this.kafkaBrokerPort}`
    );
  }
}
