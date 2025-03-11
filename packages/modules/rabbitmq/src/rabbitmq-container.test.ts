import amqp from "amqplib";
import { RabbitMQContainer } from "./rabbitmq-container";

describe("RabbitMQContainer", { timeout: 240_000 }, () => {
  // start {
  it("should start, connect and close", async () => {
    const rabbitMQContainer = await new RabbitMQContainer().start();

    const connection = await amqp.connect(rabbitMQContainer.getAmqpUrl());
    await connection.close();

    await rabbitMQContainer.stop();
  });
  // }

  // credentials {
  it("different username and password", async () => {
    const USER = "user";
    const PASSWORD = "password";

    const rabbitMQContainer = await new RabbitMQContainer()
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: USER,
        RABBITMQ_DEFAULT_PASS: PASSWORD,
      })
      .start();

    const connection = await amqp.connect({
      username: USER,
      password: PASSWORD,
      port: rabbitMQContainer.getMappedPort(5672),
    });

    await connection.close();

    await rabbitMQContainer.stop();
  });
  // }

  // pubsub {
  it("test publish and subscribe", async () => {
    const QUEUE = "test";
    const PAYLOAD = "Hello World";

    const rabbitMQContainer = await new RabbitMQContainer().start();
    const connection = await amqp.connect(rabbitMQContainer.getAmqpUrl());

    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE);

    channel.sendToQueue(QUEUE, Buffer.from(PAYLOAD));

    await new Promise((resolve) => {
      channel.consume(QUEUE, (message) => {
        expect(message?.content.toString()).toEqual(PAYLOAD);
        resolve(true);
      });
    });

    await channel.close();
    await connection.close();

    await rabbitMQContainer.stop();
  }, 10_000);
  // }
});
