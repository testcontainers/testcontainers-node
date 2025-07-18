import amqp from "amqplib";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RabbitMQContainer } from "./rabbitmq-container";

const IMAGE = getImage(__dirname);

describe("RabbitMQContainer", { timeout: 240_000 }, () => {
  // start {
  it("should start, connect and close", async () => {
    await using rabbitMQContainer = await new RabbitMQContainer(IMAGE).start();

    const connection = await amqp.connect(rabbitMQContainer.getAmqpUrl());
    await connection.close();
  });
  // }

  // credentials {
  it("different username and password", async () => {
    const USER = "user";
    const PASSWORD = "password";

    await using rabbitMQContainer = await new RabbitMQContainer(IMAGE)
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
  });
  // }

  // pubsub {
  it("test publish and subscribe", async () => {
    const QUEUE = "test";
    const PAYLOAD = "Hello World";

    await using rabbitMQContainer = await new RabbitMQContainer(IMAGE).start();
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
  }, 20_000);
  // }
});
