import { GlobalConfig, KafkaJS } from "@confluentinc/kafka-javascript";
import { StartedKafkaContainer } from "./kafka-container";

// kafkaTestHelper {
export async function assertMessageProducedAndConsumed(
  container: StartedKafkaContainer,
  additionalKafkaConfig: Partial<KafkaJS.KafkaConfig> = {},
  additionalGlobalConfig: Partial<GlobalConfig> = {}
) {
  const brokers = [`${container.getHost()}:${container.getMappedPort(9093)}`];
  const kafka = new KafkaJS.Kafka({
    kafkaJS: {
      logLevel: KafkaJS.logLevel.ERROR,
      brokers,
      ...additionalKafkaConfig,
    },
    ...additionalGlobalConfig,
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
