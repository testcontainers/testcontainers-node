import mqtt from "mqtt";
import { HiveMQContainer } from "./hivemq-container";

describe("HiveMQContainer", { timeout: 240_000 }, () => {
  // connect {
  it("should connect to HiveMQ Community Edition via MQTT.js", (done) => {
    new HiveMQContainer().start().then((hiveMQContainer) => {
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
