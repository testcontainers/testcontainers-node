import mqtt from "mqtt";
import { expect } from "vitest";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { HiveMQContainer } from "./hivemq-container";

const IMAGE = getImage(__dirname);

describe("HiveMQContainer", { timeout: 240_000 }, () => {
  it("should connect to HiveMQ Community Edition via MQTT.js", async () => {
    // hivemqConnect {
    await using container = await new HiveMQContainer(IMAGE).start();

    const mqttClient = await mqtt.connectAsync(container.getConnectionString());

    const firstMessagePromise = new Promise<{ topic: string; message: Buffer }>((resolve, reject) => {
      mqttClient.once("message", (topic, message) => resolve({ topic, message }));
      mqttClient.once("error", (err) => reject(err));
    });

    await mqttClient.subscribeAsync("test");
    await mqttClient.publishAsync("test", "Test Message");

    const { message } = await firstMessagePromise;
    expect(message.toString()).toEqual("Test Message");

    mqttClient.end();
    // }
  });
});
