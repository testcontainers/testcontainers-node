import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { StartedTestContainer } from "testcontainers";

export async function testPubSub(kafkaContainer: StartedTestContainer, additionalConfig: Partial<KafkaConfig> = {}) {
  const kafka = new Kafka({
    logLevel: logLevel.NOTHING,
    brokers: [`${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`],
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
}
