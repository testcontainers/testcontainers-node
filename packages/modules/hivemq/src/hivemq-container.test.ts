import mqtt from "mqtt";
import { HiveMQContainer } from "./hivemq-container";

const IMAGE = "hivemq/hivemq-ce:2023.5";

describe("HiveMQContainer", { timeout: 240_000 }, () => {
  // connect {
  it("should connect to HiveMQ Community Edition via MQTT.js", async () => {
    const container = await new HiveMQContainer(IMAGE).start();

    const testMqttClient = mqtt.connect(container.getConnectionString());

    const promise = new Promise<void>((resolve) => {
      testMqttClient.on("message", (topic, message) => {
        expect(message.toString()).toEqual("Test Message");
        testMqttClient.end();
        resolve();
      });
    });

    testMqttClient.on("connect", () => {
      testMqttClient.subscribe("test", (error) => {
        if (!error) {
          testMqttClient.publish("test", "Test Message");
        }
      });
    });

    return expect(promise).resolves.toBeUndefined();
  });
  // }
});
