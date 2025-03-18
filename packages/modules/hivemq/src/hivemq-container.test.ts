import mqtt from "mqtt";
import { HiveMQContainer } from "./hivemq-container";

const IMAGE = "hivemq/hivemq-ce:2023.5";

describe("HiveMQContainer", { timeout: 240_000 }, () => {
  // connect {
  it("should connect to HiveMQ Community Edition via MQTT.js", (done) => {
    new HiveMQContainer(IMAGE).start().then((hiveMQContainer) => {
      const testMqttClient = mqtt.connect(hiveMQContainer.getConnectionString());

      testMqttClient.on("message", (topic, message) => {
        expect(message.toString()).toEqual("Test Message");
        testMqttClient.end();
        done();
      });

      testMqttClient.on("connect", () => {
        testMqttClient.subscribe("test", (error) => {
          if (!error) {
            testMqttClient.publish("test", "Test Message");
          }
        });
      });
    });
  });
  // }
});
