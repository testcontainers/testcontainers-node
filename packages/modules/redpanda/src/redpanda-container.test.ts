import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RedpandaContainer, StartedRedpandaContainer } from "./redpanda-container";

const IMAGE = getImage(__dirname);

describe("RedpandaContainer", { timeout: 240_000 }, () => {
  // connectToKafka {
  it("should connect", async () => {
    await using redpandaContainer = await new RedpandaContainer(IMAGE).start();
    await testPubSub(redpandaContainer);
  });
  // }

  // connectToSchemaRegistry {
  it("should connect to schema registry", async () => {
    await using redpandaContainer = await new RedpandaContainer(IMAGE).start();
    const schemaRegistryUrl = redpandaContainer.getSchemaRegistryAddress();

    const response = await fetch(`${schemaRegistryUrl}/subjects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.schemaregistry.v1+json",
      },
    });

    expect(response.status).toBe(200);
  });
  // }

  // connectToAdmin {
  it("should connect to admin", async () => {
    await using redpandaContainer = await new RedpandaContainer(IMAGE).start();
    const adminUrl = `${redpandaContainer.getAdminAddress()}/v1`;

    const response = await fetch(adminUrl);

    expect(response.status).toBe(200);
  });
  // }

  // connectToRestProxy {
  it("should connect to rest proxy", async () => {
    await using redpandaContainer = await new RedpandaContainer(IMAGE).start();
    const restProxyUrl = `${redpandaContainer.getRestProxyAddress()}/topics`;

    const response = await fetch(restProxyUrl);

    expect(response.status).toBe(200);
  });
  // }

  const testPubSub = async (
    redpandaContainer: StartedRedpandaContainer,
    additionalConfig: Partial<KafkaConfig> = {}
  ) => {
    const kafka = new Kafka({
      logLevel: logLevel.NOTHING,
      brokers: [redpandaContainer.getBootstrapServers()],
      ...additionalConfig,
    });

    const producer = kafka.producer();
    await producer.connect();

    const consumer = kafka.consumer({ groupId: "test-group" });
    await consumer.connect();

    await producer.send({
      topic: "test-topic",
      messages: [{ value: "test message" }],
    });

    await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

    const consumedMessage = await new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => resolve(message.value?.toString()),
      });
    });

    expect(consumedMessage).toBe("test message");

    await consumer.disconnect();
    await producer.disconnect();
  };
});
