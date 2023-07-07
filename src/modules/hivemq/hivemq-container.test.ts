import { HiveMQContainer } from "./hivemq-container";
import * as mqtt from "mqtt";

describe("HiveMQContainer", () => {
  jest.setTimeout(240_000);

  // connect {
  it("should connect to HiveMQ Community Edition via MQTT.js", async () => {
    const hiveMQContainer = await new HiveMQContainer().start();

    const testMqttClient = mqtt.connect(hiveMQContainer.getConnectionString());

    testMqttClient.on("message", (topic, message) => {
      expect(message.toString()).toEqual("Test Message");

      testMqttClient.end();
    });

    testMqttClient.on("connect", () => {
      testMqttClient.subscribe("test", function (error) {
        if (!error) {
          testMqttClient.publish("test", "Test Message");
        }
      });
    });
  });
  // }
});
