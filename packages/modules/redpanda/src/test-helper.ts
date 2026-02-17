import { KafkaJS } from "@confluentinc/kafka-javascript";
import { StartedRedpandaContainer } from "./redpanda-container";

// redpandaTestHelper {
export async function assertMessageProducedAndConsumed(container: StartedRedpandaContainer) {
  const kafka = new KafkaJS.Kafka({
    kafkaJS: {
      logLevel: KafkaJS.logLevel.NOTHING,
      brokers: [container.getBootstrapServers()],
    },
  });

  const producer = kafka.producer();
  await producer.connect();
  const consumer = kafka.consumer({ kafkaJS: { groupId: "test-group", fromBeginning: true } });
  await consumer.connect();

  await producer.send({ topic: "test-topic", messages: [{ value: "test message" }] });
  await consumer.subscribe({ topic: "test-topic" });

  const consumedMessage = await new Promise((resolve) =>
    consumer.run({
      eachMessage: async ({ message }) => resolve(message.value?.toString()),
    })
  );
  expect(consumedMessage).toBe("test message");

  await consumer.disconnect();
  await producer.disconnect();
}
// }
