import { HiveMQContainer } from "./hivemq-container";
import * as mqtt from "mqtt";

describe("HiveMQContainer", () => {
  jest.setTimeout(240_000);

  // connect {
  it("should connect to HiveMQ Community Edition via MQTT.js", async () => {
    const TEST_TOPIC = "test/topic";
    const TEST_MESSAGE = "Test_Message";

    const hiveMQContainer = await new HiveMQContainer().start();

    const testMqttClient = mqtt.connect(hiveMQContainer.getConnectionString());

    async function onConnect() {
      return new Promise((resolve) => {
        testMqttClient.on("connect", () => {
          resolve(undefined);
        });
      });
    }

    async function onSubscribe() {
      return new Promise((resolve, reject) => {
        testMqttClient.subscribe(TEST_TOPIC, (error) => {
          if (error) {
            reject();
          }

          resolve(undefined);
        });
      });
    }

    await onConnect();
    await onSubscribe();

    const messagePromise = new Promise<string>((resolve) => {
      testMqttClient.on("message", (topic, message) => {
        resolve(message.toString());
      });
    });

    const publishPromise = new Promise((resolve) => {
      testMqttClient.publish(TEST_TOPIC, TEST_MESSAGE);
      resolve(undefined);
    });

    const [messageResponse] = await Promise.all([messagePromise, publishPromise]);

    expect(messageResponse).toEqual(TEST_MESSAGE);

    testMqttClient.end();
  });
  // }
});
