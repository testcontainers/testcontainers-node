import { Kafka, Producer } from "kafkajs";
import { Network, StartedNetwork } from "../network";
import { StartedTestContainer } from "../test-container";
import { GenericContainer } from "../generic-container";
import { KafkaContainer } from "./kafka-container";

describe("KafkaContainer", () => {
  jest.setTimeout(120000);

  let network: StartedNetwork;
  let kafkaContainer: StartedTestContainer;
  let zookeeperContainer: StartedTestContainer;

  let client: Kafka;
  let producer: Producer;

  beforeAll(async () => {
    network = await new Network().start();

    const ZOOKEEPER_IMAGE = "confluentinc/cp-zookeeper";
    const ZOOKEEPER_HOST_NAME = "zookeeper";
    const ZOOKEEPER_PORT = 2181;
    zookeeperContainer = await new GenericContainer(ZOOKEEPER_IMAGE)
      .withName(ZOOKEEPER_HOST_NAME)
      .withEnv("ZOOKEEPER_CLIENT_PORT", ZOOKEEPER_PORT.toString())
      .withNetworkMode(network.getName())
      .start();

    const KAFKA_IMAGE = "confluentinc/cp-kafka";
    const KAFKA_TAG = "latest";
    const KAFKA_HOST_NAME = "kafka";
    const KAFKA_PORT = 9093;
    const KAFKA_BROKER_PORT = 9092;
    kafkaContainer = await new KafkaContainer(
      KAFKA_IMAGE,
      KAFKA_TAG,
      KAFKA_PORT,
      KAFKA_HOST_NAME,
      KAFKA_BROKER_PORT,
      ZOOKEEPER_HOST_NAME,
      ZOOKEEPER_PORT
    )
      .withExposedPorts(KAFKA_PORT)
      .withNetworkMode(network.getName())
      .start();

    const clientOptions = {
      brokers: [`${kafkaContainer.getContainerIpAddress()}:${kafkaContainer.getMappedPort(KAFKA_PORT)}`],
    };
    client = new Kafka(clientOptions);

    producer = client.producer();
    await producer.connect();
  });

  afterAll(async () => {
    await producer?.disconnect();
    await kafkaContainer?.stop();
    await zookeeperContainer?.stop();
    await network?.stop();
  });

  // write tests e.g. producer test

  it("connects to kafka cluster and sends a message", async () => {
    await expect(
      producer.send({
        topic: "test-topic",
        messages: [{ value: "test message" }],
      })
    ).resolves.toBeDefined();
  });
});
