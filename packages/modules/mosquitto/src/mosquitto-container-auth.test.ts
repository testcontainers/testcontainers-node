import mqtt from "mqtt";
import { expect } from "vitest";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MosquittoContainer } from "./mosquitto-container";

const IMAGE = getImage(__dirname);

describe("MosquittoContainer", { timeout: 240_000 }, () => {
  it("should connect to Mosquitto via MQTT.js (with credentials)", async () => {
    // mosquittoConnectWithCredentials {
    await using container = await new MosquittoContainer(IMAGE)
      .withUsername("testuser")
      .withPassword("testpass")
      .start();

    expect(container.getConnectionString()).toBe(
      `mqtt://testuser:testpass@${container.getHost()}:${container.getPort()}`
    );

    const mqttClient = await mqtt.connectAsync(container.getConnectionString());

    const firstMessagePromise = new Promise<{ topic: string; message: Buffer }>((resolve, reject) => {
      mqttClient.once("message", (topic, message) => resolve({ topic, message }));
      mqttClient.once("error", (err) => reject(err));
    });

    await mqttClient.subscribeAsync("secure");
    await mqttClient.publishAsync("secure", "Secure Message");

    const { message } = await firstMessagePromise;
    expect(message.toString()).toEqual("Secure Message");

    mqttClient.end();
    // }
  });
});
