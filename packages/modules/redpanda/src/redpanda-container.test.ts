import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { RedpandaContainer, StartedRedpandaContainer } from "./redpanda-container";

describe("RedpandaContainer", { timeout: 240_000 }, () => {
  // connectToKafka {
  it("should connect", async () => {
    const redpandaContainer = await new RedpandaContainer().start();
    await testPubSub(redpandaContainer);
    await redpandaContainer.stop();
  });
  // }

  // connectToSchemaRegistry {
  it("should connect to schema registry", async () => {
    const redpandaContainer = await new RedpandaContainer().start();
    const schemaRegistryUrl = redpandaContainer.getSchemaRegistryAddress();

    const response = await fetch(`${schemaRegistryUrl}/subjects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.schemaregistry.v1+json",
      },
    });

    expect(response.status).toBe(200);

    await redpandaContainer.stop();
  });
  // }

  // connectToAdmin {
  it("should connect to admin", async () => {
    const redpandaContainer = await new RedpandaContainer().start();
    const adminUrl = `${redpandaContainer.getAdminAddress()}/v1`;

    const response = await fetch(adminUrl);

    expect(response.status).toBe(200);

    await redpandaContainer.stop();
  });
  // }

  // connectToRestProxy {
  it("should connect to rest proxy", async () => {
    const redpandaContainer = await new RedpandaContainer().start();
    const restProxyUrl = `${redpandaContainer.getRestProxyAddress()}/topics`;

    const response = await fetch(restProxyUrl);

    expect(response.status).toBe(200);

    await redpandaContainer.stop();
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
